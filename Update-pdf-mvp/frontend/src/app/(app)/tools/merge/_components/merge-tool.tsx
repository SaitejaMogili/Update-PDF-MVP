"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, X, Upload, Loader2, Download, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "merging" | "done" | "error";

interface FileItem {
  localId: string;
  file: File;
  fileId?: string;
  progress: number; // 0–100
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function MergeTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    if (!pdfs.length) return;
    setFiles((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        localId: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        progress: 0,
      })),
    ]);
  }, []);

  const removeFile = (localId: string) =>
    setFiles((prev) => prev.filter((f) => f.localId !== localId));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const reset = () => {
    setPhase("idle");
    setFiles([]);
    setDownloadUrl(null);
    setErrorMsg(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      // Upload each file, updating progress per file
      const uploadedIds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];

        // Get signed upload URL
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            contentType: "application/pdf",
            sizeBytes: item.file.size,
          }),
        });

        if (!uploadRes.ok) {
          const { error } = await uploadRes.json();
          throw new Error(error ?? "Upload failed");
        }

        const { fileId, uploadUrl } = await uploadRes.json();

        // PUT directly to Supabase Storage
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: item.file,
        });

        if (!putRes.ok) throw new Error(`Failed to upload ${item.file.name}`);

        uploadedIds.push(fileId);

        setFiles((prev) =>
          prev.map((f) =>
            f.localId === item.localId ? { ...f, fileId, progress: 100 } : f
          )
        );
      }

      // Trigger merge
      setPhase("merging");

      const mergeRes = await fetch("/api/tools/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: uploadedIds }),
      });

      if (!mergeRes.ok) {
        const { error } = await mergeRes.json();
        throw new Error(error ?? "Merge failed");
      }

      const { jobId } = await mergeRes.json();

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
          throw new Error(poll.error ?? "Merge failed on server");
        }
        attempts++;
      }

      throw new Error("Timed out waiting for merge");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Done state ───────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Merge complete!</h2>
        <p className="mb-6 text-sm text-slate-500">
          {files.length} PDFs merged into one document.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download="merged.pdf">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4" />
              Download merged PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>
            Merge more
          </Button>
        </div>
      </div>
    );
  }

  // ── Processing state ─────────────────────────────────────────
  if (phase === "merging") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">Merging your PDFs…</p>
        <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {phase === "idle" && files.length === 0 && (
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
          <p className="mb-1 text-base font-semibold text-slate-900">
            Drop your PDFs here
          </p>
          <p className="mb-4 text-sm text-slate-500">or click to browse — minimum 2 files</p>
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              PDF
            </span>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span className="text-sm font-semibold text-slate-700">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
            {phase === "idle" && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add more
              </button>
            )}
          </div>

          <ul className="divide-y divide-slate-100">
            {files.map((item) => (
              <li key={item.localId} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] text-slate-400">
                      {formatBytes(item.file.size)}
                    </p>
                    {phase === "uploading" && (
                      <div className="flex-1 max-w-24 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.progress === 100 && phase === "uploading" && (
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                </div>
                {phase === "idle" && (
                  <button
                    onClick={() => removeFile(item.localId)}
                    className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-xs text-slate-400">
              {files.length < 2 ? "Add at least 2 PDFs to merge" : "Files will be merged in order shown"}
            </p>
            <Button
              onClick={handleMerge}
              disabled={files.length < 2 || phase === "uploading"}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {phase === "uploading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Merge {files.length} PDFs
                </>
              )}
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
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      {/* Trust line */}
      <p className="text-center text-xs text-slate-400">
        Files are encrypted in transit and automatically deleted after 1 hour.
      </p>
    </div>
  );
}
