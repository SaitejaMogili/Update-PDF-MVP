"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, Loader2, Download, CheckCircle, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

export function PageNumbersTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<"header" | "footer">("footer");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center");
  const [startAt, setStartAt] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f); setPhase("idle"); setDownloadUrl(null); setErrorMsg(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) pickFile(f);
  }, [pickFile]);

  const reset = () => { setPhase("idle"); setFile(null); setDownloadUrl(null); setErrorMsg(null); };

  const handleSubmit = async () => {
    if (!file) return;
    setPhase("uploading"); setErrorMsg(null);
    try {
      const u = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: "application/pdf", sizeBytes: file.size }),
      });
      if (!u.ok) throw new Error((await u.json()).error ?? "Upload failed");
      const { fileId, uploadUrl } = await u.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!put.ok) throw new Error("Failed to upload file");

      setPhase("processing");
      const res = await fetch("/api/tools/page-numbers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, position, alignment, startAt, fontSize, prefix }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Page numbering failed");
      const { jobId } = await res.json();

      let n = 0;
      while (n < 30) {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await (await fetch(`/api/jobs/${jobId}`)).json();
        if (poll.status === "done" && poll.downloadUrl) { setDownloadUrl(poll.downloadUrl); setPhase("done"); return; }
        if (poll.status === "failed") throw new Error(poll.error ?? "Server-side failure");
        n++;
      }
      throw new Error("Timed out");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong"); setPhase("error");
    }
  };

  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-6 text-lg font-bold text-slate-900">Page numbers added!</h2>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4" /> Download
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Do another</Button>
        </div>
      </div>
    );
  }

  if (phase === "processing" || phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">
          {phase === "uploading" ? "Uploading…" : "Adding page numbers…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!file && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
          >
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="text-sm text-slate-500">or click to browse</p>
        </div>
      )}

      {file && phase === "idle" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {(["header", "footer"] as const).map((p) => (
                  <button
                    key={p} type="button" onClick={() => setPosition(p)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      position === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">Alignment</label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a} type="button" onClick={() => setAlignment(a)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      alignment === a ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >{a}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start at</label>
              <input
                type="number" min={1} max={9999} value={startAt}
                onChange={(e) => setStartAt(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Font size</label>
              <input
                type="number" min={6} max={48} value={fontSize}
                onChange={(e) => setFontSize(Math.max(6, Math.min(48, parseInt(e.target.value) || 10)))}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Prefix (optional)</label>
              <input
                type="text" value={prefix} onChange={(e) => setPrefix(e.target.value.slice(0, 20))}
                placeholder='e.g. "Page " — output: "Page 1", "Page 2"…'
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400">1 credit will be used</p>
            <Button onClick={handleSubmit} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Hash className="h-4 w-4" /> Add page numbers
            </Button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
          <button onClick={() => { setPhase("idle"); setErrorMsg(null); }} className="mt-3 text-xs font-medium text-red-700 underline">
            Try again
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
    </div>
  );
}
