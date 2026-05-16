"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, Download, Plus, CheckCircle, Images, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

interface ImgItem {
  localId: string;
  file: File;
  preview: string;
  imageId?: string;
}

const ALLOWED = ["image/png", "image/jpeg", "image/webp"] as const;

function fmt(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

export function JpgToPdfTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<ImgItem[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fs: FileList | File[]) => {
    const imgs = Array.from(fs).filter((f) => (ALLOWED as readonly string[]).includes(f.type));
    if (!imgs.length) return;
    setItems((prev) => [
      ...prev,
      ...imgs.map((f) => ({
        localId: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
      })),
    ]);
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.localId === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((i) => i.localId !== id);
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.localId === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const reset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]); setPhase("idle"); setDownloadUrl(null); setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setPhase("uploading"); setErrorMsg(null);
    try {
      // Upload each image
      const uploaded: string[] = [];
      for (const item of items) {
        const u = await fetch("/api/upload-image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: item.file.name, contentType: item.file.type, sizeBytes: item.file.size }),
        });
        if (!u.ok) throw new Error((await u.json()).error ?? "Upload init failed");
        const { imageId, uploadUrl } = await u.json();
        const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": item.file.type }, body: item.file });
        if (!put.ok) throw new Error(`Failed to upload ${item.file.name}`);
        uploaded.push(imageId);
      }

      setPhase("processing");
      const res = await fetch("/api/tools/jpg-to-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: uploaded }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Conversion failed");
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
        <h2 className="mb-6 text-lg font-bold text-slate-900">PDF created!</h2>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="h-4 w-4" /> Download
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Convert another set</Button>
        </div>
      </div>
    );
  }

  if (phase === "processing" || phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">
          {phase === "uploading" ? "Uploading images…" : "Building PDF…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
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
          <p className="mb-1 text-base font-semibold text-slate-900">Drop images here</p>
          <p className="text-sm text-slate-500">JPG, PNG, or WebP — up to 50 images, 10 MB each</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">
              {items.length} image{items.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add more
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((it, idx) => (
              <div key={it.localId} className="flex items-center gap-3 px-5 py-3">
                <span className="font-mono text-xs text-slate-400 w-6 text-center">{idx + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(it.localId, -1)} disabled={idx === 0}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >▲</button>
                  <button
                    onClick={() => move(it.localId, 1)} disabled={idx === items.length - 1}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >▼</button>
                </div>
                <GripVertical className="h-4 w-4 text-slate-300" />
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.preview} alt={it.file.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{it.file.name}</p>
                  <p className="font-mono text-[11px] text-slate-400">{fmt(it.file.size)}</p>
                </div>
                <button onClick={() => removeItem(it.localId)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400">1 credit will be used</p>
            <Button onClick={handleSubmit} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Images className="h-4 w-4" /> Convert to PDF
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

      <input
        ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
