"use client";

import { useRef, useState } from "react";
import { MessageSquare, Send, Loader2, Bot, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrainAgent } from "./brain-workspace";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";

interface Citation {
  filename: string;
  pageNumber: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

interface Props {
  workspaceId: string;
  agents: BrainAgent[];
  hasDocuments: boolean;
}

function CitationBadge({ citation }: { citation: Citation }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
      {citation.filename}, p.{citation.pageNumber}
    </span>
  );
}

export function BrainChat({ workspaceId, agents, hasDocuments }: Props) {
  const [agentName, setAgentName] = useState("General");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;
    const userText = input.trim();
    setInput("");
    setIsSending(true);
    setErrorMsg(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "", streaming: true },
    ]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/brain/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId, agentName }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let messageCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const raw = part.slice(6);

          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.error) throw new Error(parsed.error);

            if (parsed.token) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                }
                return next;
              });
              scrollToBottom();
            }

            if (parsed.meta) {
              if (parsed.meta.sessionId) setSessionId(parsed.meta.sessionId);
              if (parsed.meta.citations) messageCitations = parsed.meta.citations;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
          }
        }
      }

      // Finalize message with citations
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, streaming: false, citations: messageCitations };
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { role: "assistant", content: msg };
        }
        return next;
      });
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!hasDocuments) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: BRAIN_GRADIENT }}
        >
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="mb-2 font-semibold text-slate-800">No documents yet</h3>
        <p className="text-sm text-slate-500">
          Add PDF documents in the <strong>Documents</strong> tab to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[640px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header with agent selector */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: BRAIN_GRADIENT }}
          >
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Brain Chat</p>
            <p className="text-xs text-slate-400">5 credits per message</p>
          </div>
        </div>

        {/* Agent selector */}
        <div className="relative">
          <select
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none transition-colors"
          >
            {agents.length > 0 ? (
              agents.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))
            ) : (
              ["General", "Legal", "HR", "Finance"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: BRAIN_GRADIENT }}
            >
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Chat across your document library
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try &ldquo;Summarize all documents&rdquo; or &ldquo;What are the key obligations?&rdquo;
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs"
              style={
                msg.role === "assistant"
                  ? { background: BRAIN_GRADIENT }
                  : { background: "#2563EB" }
              }
            >
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </div>
            <div className={`max-w-[78%] space-y-1.5 ${msg.role === "user" ? "items-end flex flex-col" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-sm"
                }`}
              >
                {msg.content || (msg.streaming && (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                  </span>
                ))}
              </div>
              {/* Citations */}
              {msg.role === "assistant" && !msg.streaming && msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {msg.citations.map((c, ci) => (
                    <CitationBadge key={ci} citation={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {errorMsg && (
          <p className="text-center text-xs text-red-500">{errorMsg}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question across your documents… (Enter to send)"
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="h-[42px] w-[42px] shrink-0 rounded-xl p-0 text-white disabled:opacity-50"
            style={{ background: BRAIN_GRADIENT }}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
