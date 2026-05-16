"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, Loader2, Download, CheckCircle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function SplitTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [pageSpec, setPageSpec] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setPhase("idle");
    setErrorMsg(null);
    setDownloadUrl(null);
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
    setPageSpec("");
    setDownloadUrl(null);
    setErrorMsg(null);
  };

  const handleSplit = async () => {
    if (!file || !pageSpec.trim()) return;
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

      // Trigger split
      setPhase("processing");

      const splitRes = await fetch("/api/tools/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, pageSpec: pageSpec.trim() }),
      });

      if (!splitRes.ok) {
        const { error } = await splitRes.json();
        throw new Error(error ?? "Split failed");
      }

      const { jobId } = await splitRes.json();

      // Poll for completion
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
        if (poll.status === "failed") {
          throw new Error(poll.error ?? "Split failed on server");
        }
        attempts++;
      }

      throw new Error("Timed out waiting for split");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Done ─────────────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Split complete!</h2>
        <p className="mb-6 text-sm text-slate-500">
          Pages <span className="font-medium text-slate-700">{pageSpec}</span> extracted successfully.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>
            Split another
          </Button>
        </div>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────
  if (phase === "processing" || phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">
          {phase === "uploading" ? "Uploading…" : "Splitting your PDF…"}
        </p>
        <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone — shown when no file selected */}
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

      {/* File card + range input — shown when file is selected */}
      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* File info */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Change
            </button>
          </div>

          {/* Page range input */}
          <div className="px-5 py-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Page range
              </label>
              <input
                type="text"
                value={pageSpec}
                onChange={(e) => setPageSpec(e.target.value)}
                placeholder="e.g. 1-3, 5, 7-9"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Use commas to separate pages or ranges — e.g.{" "}
                <span className="font-mono">1-3, 5, 8-10</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-400">
                {pageSpec.trim() ? "Ready to extract" : "Enter a page range to continue"}
              </p>
              <Button
                onClick={handleSplit}
                disabled={!pageSpec.trim()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                <Scissors className="h-4 w-4" />
                Extract pages
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
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
