"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, Loader2, Download, CheckCircle, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function PdfToJpgTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setPhase("idle");
    setDownloadUrl(null);
    setErrorMsg(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) pickFile(f);
    },
    [pickFile]
  );

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setDownloadUrl(null);
    setErrorMsg(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: "application/pdf", sizeBytes: file.size }),
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

      setPhase("processing");

      const res = await fetch("/api/tools/pdf-to-jpg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Conversion failed");
      }
      const { jobId } = await res.json();

      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await fetch(`/api/jobs/${jobId}`);
        const poll = await pollRes.json();
        if (poll.status === "done" && poll.downloadUrl) {
          setDownloadUrl(poll.downloadUrl);
          setPhase("done");
          return;
        }
        if (poll.status === "failed") throw new Error(poll.error ?? "Conversion failed on server");
        attempts++;
      }
      throw new Error("Timed out waiting for conversion");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Conversion complete!</h2>
        <p className="mb-6 text-sm text-slate-500">
          Each page has been converted to a JPG. Download the ZIP to get all images.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4" />
              Download ZIP
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Convert another</Button>
        </div>
      </div>
    );
  }

  if (phase === "processing" || phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">
          {phase === "uploading" ? "Uploading…" : "Converting to JPG…"}
        </p>
        <p className="mt-1 text-sm text-slate-500">Each page is being converted. This may take a moment.</p>
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
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
          >
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            PDF
          </span>
        </div>
      )}

      {file && phase === "idle" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Change
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-xs text-slate-400">Each page → 1 JPG, delivered as ZIP — 1 credit</p>
            <Button onClick={handleConvert} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Image className="h-4 w-4" />
              Convert to JPG
            </Button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
          <button
            onClick={() => { setPhase("idle"); setErrorMsg(null); }}
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
