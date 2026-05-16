import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { embedQuery, searchBrain } from "@/lib/brain";
import { openai } from "@/lib/openai";

export const dynamic = "force-dynamic";

const CREDIT_COST = 5;

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  agentName: z.string().max(50).optional(),
});

const AGENT_PROMPTS: Record<string, string> = {
  Legal:
    "You are a legal analyst reviewing contracts and legal documents. Identify key clauses, obligations, risks, and important dates. Always cite sources as [filename, p.N].",
  HR: "You analyze HR documents including policies, employment contracts, and handbooks. Highlight key policies, rights, obligations, and compliance requirements. Always cite sources as [filename, p.N].",
  Finance:
    "You review financial documents including reports, invoices, contracts, and statements. Extract key figures, trends, and financial obligations. Always cite sources as [filename, p.N].",
  General:
    "You answer questions about the documents in this workspace. Be thorough, accurate, and concise. Always cite sources as [filename, p.N].",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id: workspaceId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const { message, sessionId: incomingSessionId, agentName = "General" } = parsed.data;
  const service = createServiceClient();

  // Verify workspace ownership and get file_ids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace } = await (service.from("brain_workspaces" as never) as any)
    .select("id,file_ids")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) {
    return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404 });
  }

  const fileIds: string[] = workspace.file_ids ?? [];
  if (fileIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "Add documents to your workspace first" }),
      { status: 400 }
    );
  }

  // Debit credits before expensive ops
  const debit = await debitCredits(user.id, CREDIT_COST, "brain-chat", workspaceId);
  if (!debit.ok) {
    return new Response(
      JSON.stringify({
        error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error",
      }),
      { status: 402 }
    );
  }

  // Resolve session
  let sessionId = incomingSessionId ?? null;

  if (sessionId) {
    // Verify ownership of existing session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSession } = await (service.from("brain_sessions" as never) as any)
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (!existingSession) sessionId = null; // Treat as new session if invalid
  }

  if (!sessionId) {
    // Create new session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newSession } = await (service.from("brain_sessions" as never) as any)
      .insert({ workspace_id: workspaceId, user_id: user.id, agent_name: agentName })
      .select("id")
      .single();
    sessionId = newSession?.id ?? null;
  }

  if (!sessionId) {
    await refundCredits(user.id, CREDIT_COST, "brain_session_failed");
    return new Response(JSON.stringify({ error: "Failed to create session" }), { status: 500 });
  }

  const resolvedSessionId = sessionId;

  // Save user message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service.from("brain_messages" as never) as any).insert({
    session_id: resolvedSessionId,
    role: "user",
    content: message,
    citations: [],
  });

  // Fetch recent message history (last 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: history } = await (service.from("brain_messages" as never) as any)
    .select("role,content")
    .eq("session_id", resolvedSessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyMessages = ((history ?? []) as Array<{ role: string; content: string }>)
    .reverse()
    .slice(0, -1) // exclude the message we just inserted
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Fetch agent system prompt
  let systemPromptBase = AGENT_PROMPTS[agentName] ?? AGENT_PROMPTS.General;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agentRow } = await (service.from("brain_agents" as never) as any)
      .select("system_prompt")
      .eq("name", agentName)
      .single();
    if (agentRow?.system_prompt) {
      systemPromptBase = agentRow.system_prompt + " Always cite sources as [filename, p.N].";
    }
  } catch {
    // Use fallback
  }

  // Stream response
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: string) =>
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        let fullResponse = "";
        const citations: Array<{ filename: string; pageNumber: number }> = [];

        try {
          // Embed query and search
          const embedding = await embedQuery(message);
          const chunks = await searchBrain(embedding, fileIds, 8);

          // Build context with citations
          const contextText = chunks
            .map((c) => `[Source: ${c.filename}, p.${c.pageNumber}] ${c.content}`)
            .join("\n\n");

          // Extract unique citations
          const seen = new Set<string>();
          for (const c of chunks) {
            const key = `${c.filename}:${c.pageNumber}`;
            if (!seen.has(key)) {
              seen.add(key);
              citations.push({ filename: c.filename, pageNumber: c.pageNumber });
            }
          }

          const systemPrompt = contextText
            ? `${systemPromptBase}\n\nDocument context:\n${contextText}`
            : systemPromptBase;

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
              send(JSON.stringify({ token }));
            }
          }

          // Send meta (sessionId + citations) before DONE
          send(
            JSON.stringify({
              meta: { sessionId: resolvedSessionId, citations },
            })
          );
          send("[DONE]");

          // Save assistant message
          await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service.from("brain_messages" as never) as any).insert({
              session_id: resolvedSessionId,
              role: "assistant",
              content: fullResponse,
              citations,
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service.from("brain_sessions" as never) as any)
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", resolvedSessionId),
          ]);
        } catch (err) {
          await refundCredits(user.id, CREDIT_COST, "brain_chat_stream_failed");
          send(JSON.stringify({ error: "Stream failed" }));
          console.error("[brain/chat]", err);
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
