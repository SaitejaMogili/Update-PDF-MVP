"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  Upload,
  FileText,
  Loader2,
  Send,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

type Phase = "idle" | "uploading" | "ingesting" | "ready" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function ChatTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFile = async (f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setErrorMsg(null);
    setPhase("uploading");

    try {
      // Upload
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f.name,
          contentType: "application/pdf",
          sizeBytes: f.size,
        }),
      });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error ?? "Upload failed");
      const { fileId: fid, uploadUrl } = await uploadRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: f,
      });
      if (!putRes.ok) throw new Error("Failed to upload file");

      setFileId(fid);
      setPhase("ingesting");

      // Ingest (embed chunks)
      const ingestRes = await fetch("/api/tools/chat/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fid }),
      });
      if (!ingestRes.ok) {
        const { error } = await ingestRes.json();
        throw new Error(error ?? "Ingestion failed");
      }
      const { sessionId: sid } = await ingestRes.json();
      setSessionId(sid);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isSending) return;
    const userText = input.trim();
    setInput("");
    setIsSending(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/tools/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userText }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const data = part.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + parsed.text };
                }
                return next;
              });
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
          }
        }
      }

      // Mark streaming done
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            content: err instanceof Error ? err.message : "Something went wrong.",
          };
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

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setSessionId(null);
    setFileId(null);
    setMessages([]);
    setInput("");
    setErrorMsg(null);
  };

  // ── Upload / Ingest phases ─────────────────────────────────────
  if (phase === "idle" || phase === "error") {
    return (
      <div className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: AI_GRADIENT }}
          >
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here to start chatting</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse — 5 credits per message</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            PDF
          </span>
        </div>

        {phase === "error" && errorMsg && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to load document</p>
              <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <p className="text-center text-xs text-slate-400">
          Files are encrypted in transit and automatically deleted after 1 hour.
        </p>
      </div>
    );
  }

  if (phase === "uploading" || phase === "ingesting") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: AI_GRADIENT }}
        >
          {phase === "uploading"
            ? <Loader2 className="h-7 w-7 animate-spin" />
            : <MessageSquareText className="h-7 w-7 animate-pulse" />}
        </div>
        <p className="font-semibold text-slate-900">
          {phase === "uploading" ? "Uploading document…" : "Reading and indexing your PDF…"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {phase === "uploading" ? "Just a moment." : "This may take 10–30 seconds for large documents."}
        </p>
      </div>
    );
  }

  // ── Chat interface ─────────────────────────────────────────────
  return (
    <div className="flex h-[600px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: AI_GRADIENT }}>
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 truncate max-w-64">{file?.name}</p>
            <p className="text-xs text-slate-400">{file ? formatBytes(file.size) : ""} · 5 credits/message</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Change PDF
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: AI_GRADIENT }}
            >
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Ask anything about your document</p>
              <p className="mt-1 text-xs text-slate-400">Try "Summarize this document" or "What are the key clauses?"</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs ${
                msg.role === "user" ? "bg-blue-600" : ""
              }`}
              style={msg.role === "assistant" ? { background: AI_GRADIENT } : undefined}
            >
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
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
          </div>
        ))}
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
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 transition-all"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="h-[42px] w-[42px] shrink-0 rounded-xl p-0 text-white disabled:opacity-50"
            style={{ background: AI_GRADIENT }}
          >
            {isSending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
