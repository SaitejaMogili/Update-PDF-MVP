"use client";

import { useRef, useState } from "react";
import { Sparkles, Upload, FileText, CheckCircle, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SummaryResult } from "@/lib/tools/summarize";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function SummarizeTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setPhase("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  const handleSummarize = async () => {
    if (!file) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      // Upload file
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: "application/pdf",
          sizeBytes: file.size,
        }),
      });

      if (!uploadRes.ok) {
        const { error } = await uploadRes.json();
        throw new Error(error ?? "Upload failed");
      }

      const { fileId, uploadUrl } = await uploadRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!putRes.ok) throw new Error("Failed to upload file");

      // Summarize
      setPhase("processing");

      const summarizeRes = await fetch("/api/tools/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (!summarizeRes.ok) {
        const { error } = await summarizeRes.json();
        throw new Error(error ?? "Summarization failed");
      }

      const { result: summary } = await summarizeRes.json();
      setResult(summary);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = [
      result.title,
      "",
      result.summary,
      "",
      "Key Points:",
      ...result.keyPoints.map((p) => `• ${p}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Done state ─────────────────────────────────────────────────
  if (phase === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Summary ready</p>
                <p className="text-xs text-slate-400 capitalize">{result.documentType} · ~{result.wordCountEstimate.toLocaleString()} words</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Title */}
          <div className="px-6 pt-5 pb-0">
            <h2 className="text-lg font-bold text-slate-900">{result.title}</h2>
          </div>

          {/* Summary */}
          <div className="px-6 py-4">
            <p className="text-sm leading-relaxed text-slate-700">{result.summary}</p>
          </div>

          {/* Key points */}
          {result.keyPoints.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Key Points
              </p>
              <ul className="space-y-2">
                {result.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
                    >
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={reset} className="gap-2">
            <FileText className="h-4 w-4" />
            Summarize another
          </Button>
        </div>
      </div>
    );
  }

  // ── Processing state ───────────────────────────────────────────
  if (phase === "processing") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
        >
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>
        <p className="font-semibold text-slate-900">AI is reading your document…</p>
        <p className="mt-1 text-sm text-slate-500">This usually takes 5–15 seconds.</p>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-violet-600" />
        <p className="font-semibold text-slate-900">Uploading…</p>
      </div>
    );
  }

  // ── Idle / file selected ───────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {!file && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) pickFile(f);
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
          >
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse — max 10 MB</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            PDF
          </span>
        </div>
      )}

      {/* File selected */}
      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="font-mono text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Change
            </button>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">3 credits will be used</p>
            <Button
              onClick={handleSummarize}
              className="gap-2 text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)" }}
            >
              <Sparkles className="h-4 w-4" />
              Summarize PDF
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
      />

      <p className="text-center text-xs text-slate-400">
        Files are encrypted in transit and automatically deleted after 1 hour.
      </p>
    </div>
  );
}
