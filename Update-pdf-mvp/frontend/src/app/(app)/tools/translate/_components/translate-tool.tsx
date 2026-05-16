"use client";

import { useRef, useState } from "react";
import { Languages, Upload, FileText, Loader2, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES, needsFontWarning, type LanguageCode } from "@/lib/tools/translate-shared";

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

type Phase = "idle" | "uploading" | "translating" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function TranslateTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState<LanguageCode>("fr");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setDownloadUrl(null);
    setOutputFilename(null);
    setErrorMsg(null);
  };

  const handleTranslate = async () => {
    if (!file) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      // Upload
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: "application/pdf", sizeBytes: file.size }),
      });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error ?? "Upload failed");
      const { fileId, uploadUrl } = await uploadRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Failed to upload file");

      // Translate (synchronous, may take 10–30s)
      setPhase("translating");
      const res = await fetch("/api/tools/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, targetLang }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Translation failed");

      const { downloadUrl: url, filename } = await res.json();
      setDownloadUrl(url);
      setOutputFilename(filename);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Done ──────────────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Translation complete!</h2>
        <p className="mb-6 text-sm text-slate-500">
          Translated to <span className="font-semibold">{LANGUAGES[targetLang]}</span>
          {needsFontWarning(targetLang) && (
            <span className="block mt-1 text-amber-600">
              Note: {LANGUAGES[targetLang]} characters may display as boxes in the PDF — the translation text is correct.
            </span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download={outputFilename ?? "translated.pdf"}>
            <Button className="gap-2 text-white" style={{ background: AI_GRADIENT }}>
              <Download className="h-4 w-4" />
              Download translated PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Translate another</Button>
        </div>
      </div>
    );
  }

  // ── Translating ───────────────────────────────────────────────
  if (phase === "translating") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: AI_GRADIENT }}
        >
          <Languages className="h-7 w-7 animate-pulse" />
        </div>
        <p className="font-semibold text-slate-900">Translating to {LANGUAGES[targetLang]}…</p>
        <p className="mt-1 text-sm text-slate-500">This usually takes 10–30 seconds.</p>
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

  // ── Idle ──────────────────────────────────────────────────────
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
            if (f?.type === "application/pdf") setFile(f);
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
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse — max 10 MB</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">PDF</span>
        </div>
      )}

      {/* File + language selector */}
      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* File row */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="font-mono text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Change
            </button>
          </div>

          {/* Language picker */}
          <div className="border-t border-slate-100 px-5 py-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Translate to
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {(Object.entries(LANGUAGES) as [LanguageCode, string][]).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setTargetLang(code)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    targetLang === code
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {needsFontWarning(targetLang) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700">
                  {LANGUAGES[targetLang]} uses a non-Latin script. The translation will be accurate but may not render correctly in the PDF due to font limitations.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 flex items-center justify-between px-5 py-3">
            <p className="text-xs text-slate-400">5 credits will be used</p>
            <Button
              onClick={handleTranslate}
              className="gap-2 text-white"
              style={{ background: AI_GRADIENT }}
            >
              <Languages className="h-4 w-4" />
              Translate to {LANGUAGES[targetLang]}
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
          <button onClick={reset} className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
      />
      <p className="text-center text-xs text-slate-400">
        Files are encrypted in transit and automatically deleted after 1 hour.
      </p>
    </div>
  );
}
