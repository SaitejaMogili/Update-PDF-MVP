import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { embedQuery, searchChunks } from "@/lib/tools/chat";
import { openai } from "@/lib/openai";

export const dynamic = "force-dynamic";

const CREDIT_COST = 5;

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { sessionId, message } = parsed.data;
  const service = createServiceClient();

  // Verify session belongs to user
  const { data: session } = await service
    .from("chat_sessions")
    .select("id, file_ids")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  // Debit credits before expensive ops
  const debit = await debitCredits(user.id, CREDIT_COST, "chat", sessionId);
  if (!debit.ok) {
    return new Response(
      JSON.stringify({ error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" }),
      { status: 402 }
    );
  }

  const fileId = session.file_ids[0] as string;

  // Get chat history (last 10 messages)
  const { data: history } = await service
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyMessages = (history ?? []).reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Embed query + vector search
  let contextText = "";
  try {
    const embedding = await embedQuery(message);
    const chunks = await searchChunks(embedding, fileId, 5);
    contextText = chunks
      .map((c) => `[Page ${c.pageNumber}] ${c.content}`)
      .join("\n\n");
  } catch {
    // Non-fatal: continue without context if search fails
  }

  const systemPrompt = contextText
    ? `You are a helpful assistant that answers questions about the user's PDF document.
Use ONLY the following document excerpts to answer. If the answer isn't in the excerpts, say so.
Cite page numbers when relevant (e.g. "According to page 3...").

Document excerpts:
${contextText}`
    : "You are a helpful assistant that answers questions about the user's PDF document.";

  // Stream the response
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = "";

        const send = (payload: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

        try {
          // Save user message
          await service.from("chat_messages").insert({
            session_id: sessionId,
            role: "user",
            content: message,
          });

          const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: message },
            ],
          });

          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (token) {
              fullResponse += token;
              send({ text: token });
            }
          }

          // Save assistant message + update session timestamp
          await Promise.all([
            service.from("chat_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: fullResponse,
            }),
            service
              .from("chat_sessions")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", sessionId),
          ]);

          send({ done: true });
        } catch (err) {
          await refundCredits(user.id, CREDIT_COST, "chat_stream_failed");
          send({ error: "Stream failed" });
          console.error("[chat/message]", err);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    }
  );
}
