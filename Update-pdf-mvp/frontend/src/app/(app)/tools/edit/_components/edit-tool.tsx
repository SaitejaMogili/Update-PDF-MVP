"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Upload, Loader2, Download, CheckCircle, PenLine, X, MousePointer, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Phase = "idle" | "loading" | "ready" | "uploading" | "processing" | "done" | "error";
type AnnotationKind = "text" | "image";
type Rotation = 0 | 90 | 180 | 270;

interface PageSize { width: number; height: number; }

interface BaseAnnotation {
  id: string;
  page: number;   // 1-indexed
  x: number;
  y: number;
  rotation: Rotation;
}
interface TextAnnotation extends BaseAnnotation {
  kind: "text";
  text: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
}
interface ImageAnnotation extends BaseAnnotation {
  kind: "image";
  imageFile: File;
  localUrl: string;   // URL.createObjectURL — for preview only
  width: number;
  height: number;
}
type Annotation = TextAnnotation | ImageAnnotation;

const FONT_SIZES = [8, 10, 12, 14, 18, 24, 36];
const ROTATIONS: Rotation[] = [0, 90, 180, 270];
const PREVIEW_CSS_WIDTH = 520;
const COLORS = [
  { hex: "000000", bg: "#000000", label: "Black" },
  { hex: "DC2626", bg: "#DC2626", label: "Red" },
  { hex: "2563EB", bg: "#2563EB", label: "Blue" },
  { hex: "059669", bg: "#059669", label: "Green" },
  { hex: "7C3AED", bg: "#7C3AED", label: "Purple" },
  { hex: "6B7280", bg: "#6B7280", label: "Gray" },
];

function uid() { return Math.random().toString(36).slice(2); }
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}
function toFontName(bold: boolean, italic: boolean) {
  if (bold && italic) return "Helvetica-BoldOblique";
  if (bold) return "Helvetica-Bold";
  if (italic) return "Helvetica-Oblique";
  return "Helvetica";
}

export function EditTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [activeKind, setActiveKind] = useState<AnnotationKind>("text");

  // Text draft
  const [draftText, setDraftText] = useState("");
  const [draftSize, setDraftSize] = useState(14);
  const [draftColor, setDraftColor] = useState("000000");
  const [draftBold, setDraftBold] = useState(false);
  const [draftItalic, setDraftItalic] = useState(false);
  const [draftRotation, setDraftRotation] = useState<Rotation>(0);

  // Image draft
  const [draftImage, setDraftImage] = useState<File | null>(null);
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [draftImgW, setDraftImgW] = useState(150);
  const [draftImgH, setDraftImgH] = useState(150);
  const [draftImgRotation, setDraftImgRotation] = useState<Rotation>(0);

  // Pending click position
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Load PDF on file change
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null; }
      setPhase("loading");
      setPageSizes([]);
      setAnnotations([]);
      setCurrentPage(1);
      setPendingPos(null);
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) { doc.destroy(); return; }
        pdfDocRef.current = doc;
        const sizes: PageSize[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i);
          const vp = pg.getViewport({ scale: 1 });
          sizes.push({ width: vp.width, height: vp.height });
          pg.cleanup();
        }
        if (!cancelled) { setPageSizes(sizes); setPhase("ready"); }
      } catch {
        if (!cancelled) { setPhase("error"); setErrorMsg("Could not read PDF — file may be corrupted or password-protected."); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Render page on canvas
  useEffect(() => {
    if (phase !== "ready" || !pdfDocRef.current || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      setRendering(true);
      try {
        const page = await pdfDocRef.current!.getPage(currentPage);
        if (cancelled) { page.cleanup(); return; }
        const baseVP = page.getViewport({ scale: 1 });
        const scale = PREVIEW_CSS_WIDTH / baseVP.width;
        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(vp.width * dpr);
        canvas.height = Math.round(vp.height * dpr);
        canvas.style.width = `${Math.round(vp.width)}px`;
        canvas.style.height = `${Math.round(vp.height)}px`;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        // pdfjs-dist v4+ requires `canvas` (HTMLCanvasElement), not `canvasContext`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = page.render({ canvas: canvas, canvasContext: ctx, viewport: vp } as any);
        renderTaskRef.current = task;
        await task.promise;
        page.cleanup();
        if (!cancelled) setRendering(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "RenderingCancelledException" && !cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [phase, currentPage]);

  // Cleanup object URLs when annotations change
  useEffect(() => {
    return () => {
      annotations.forEach((a) => { if (a.kind === "image") URL.revokeObjectURL(a.localUrl); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setDownloadUrl(null);
    setErrorMsg(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const pickImage = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (draftImageUrl) URL.revokeObjectURL(draftImageUrl);
    const url = URL.createObjectURL(f);
    setDraftImage(f);
    setDraftImageUrl(url);
    // Auto-set size from natural image dimensions
    const img = new Image();
    img.onload = () => {
      const maxDim = 200;
      const ratio = img.naturalWidth / img.naturalHeight;
      if (img.naturalWidth > img.naturalHeight) {
        setDraftImgW(Math.min(img.naturalWidth, maxDim));
        setDraftImgH(Math.round(Math.min(img.naturalWidth, maxDim) / ratio));
      } else {
        setDraftImgH(Math.min(img.naturalHeight, maxDim));
        setDraftImgW(Math.round(Math.min(img.naturalHeight, maxDim) * ratio));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
    // Re-create URL after size detection (revokeObjectURL called above in onload)
    const previewUrl = URL.createObjectURL(f);
    setDraftImageUrl(previewUrl);
  };

  const reset = () => {
    if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null; }
    annotations.forEach((a) => { if (a.kind === "image") URL.revokeObjectURL(a.localUrl); });
    if (draftImageUrl) URL.revokeObjectURL(draftImageUrl);
    setPhase("idle");
    setFile(null);
    setPageSizes([]);
    setAnnotations([]);
    setCurrentPage(1);
    setPendingPos(null);
    setDownloadUrl(null);
    setErrorMsg(null);
    setDraftText("");
    setDraftBold(false);
    setDraftItalic(false);
    setDraftRotation(0);
    setDraftImage(null);
    setDraftImageUrl(null);
  };

  const currentPageSize = pageSizes[currentPage - 1] ?? { width: 612, height: 792 };
  const scale = PREVIEW_CSS_WIDTH / currentPageSize.width;
  const previewCssH = Math.round(currentPageSize.height * scale);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPendingPos({ x: Math.round((e.clientX - rect.left) / scale), y: Math.round((e.clientY - rect.top) / scale) });
  };

  const placeAnnotation = () => {
    if (!pendingPos) return;
    if (activeKind === "text") {
      if (!draftText.trim()) return;
      setAnnotations((prev) => [
        ...prev,
        { id: uid(), kind: "text", page: currentPage, ...pendingPos, text: draftText.trim(), fontSize: draftSize, fontColor: draftColor, bold: draftBold, italic: draftItalic, rotation: draftRotation },
      ]);
      setDraftText("");
    } else {
      if (!draftImage || !draftImageUrl) return;
      const localUrl = URL.createObjectURL(draftImage);
      setAnnotations((prev) => [
        ...prev,
        { id: uid(), kind: "image", page: currentPage, ...pendingPos, imageFile: draftImage, localUrl, width: draftImgW, height: draftImgH, rotation: draftImgRotation },
      ]);
    }
    setPendingPos(null);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.kind === "image") URL.revokeObjectURL(removed.localUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleApply = async () => {
    if (!file || annotations.length === 0) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      // 1. Upload the source PDF
      const uploadRes = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: "application/pdf", sizeBytes: file.size }),
      });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error ?? "Upload failed");
      const { fileId, uploadUrl } = await uploadRes.json();
      if (!(await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file })).ok)
        throw new Error("Failed to upload PDF");

      // 2. Upload each unique image stamp
      const imageIdMap = new Map<string, string>(); // annotation.id → imageId
      for (const a of annotations) {
        if (a.kind !== "image") continue;
        const imgRes = await fetch("/api/upload-image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: a.imageFile.name, contentType: a.imageFile.type, sizeBytes: a.imageFile.size }),
        });
        if (!imgRes.ok) throw new Error((await imgRes.json()).error ?? "Image upload failed");
        const { imageId, uploadUrl: imgUploadUrl } = await imgRes.json();
        if (!(await fetch(imgUploadUrl, { method: "PUT", headers: { "Content-Type": a.imageFile.type }, body: a.imageFile })).ok)
          throw new Error("Failed to upload image stamp");
        imageIdMap.set(a.id, imageId);
      }

      setPhase("processing");

      // 3. Call the edit API
      const payload = annotations.map((a) => {
        if (a.kind === "image") {
          return { type: "image", imageId: imageIdMap.get(a.id)!, page: a.page, x: a.x, y: a.y, width: a.width, height: a.height, rotation: a.rotation };
        }
        return { type: "text", text: a.text, page: a.page, x: a.x, y: a.y, fontSize: a.fontSize, fontColor: a.fontColor, fontName: toFontName(a.bold, a.italic), rotation: a.rotation };
      });

      const res = await fetch("/api/tools/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, annotations: payload }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Edit failed");
      const { jobId } = await res.json();

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await (await fetch(`/api/jobs/${jobId}`)).json();
        if (poll.status === "done" && poll.downloadUrl) { setDownloadUrl(poll.downloadUrl); setPhase("done"); return; }
        if (poll.status === "failed") throw new Error(poll.error ?? "Edit failed on server");
      }
      throw new Error("Timed out");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // ── Done ────────────────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">PDF edited!</h2>
        <p className="mb-6 text-sm text-slate-500">Your annotations have been applied.</p>
        <div className="flex justify-center gap-3">
          <a href={downloadUrl} download>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><Download className="h-4 w-4" /> Download</Button>
          </a>
          <Button variant="outline" onClick={reset}>Edit another</Button>
        </div>
      </div>
    );
  }

  if (phase === "uploading" || phase === "processing") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" />
        <p className="font-semibold text-slate-900">{phase === "uploading" ? "Uploading files…" : "Applying edits…"}</p>
        <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds.</p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Reading PDF…</p>
      </div>
    );
  }

  if (phase === "error" && !file) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="text-sm font-semibold text-red-700">Error</p>
        <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
        <button onClick={reset} className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline">Try a different file</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {phase === "idle" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"}`}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}>
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">PDF</span>
        </div>
      )}

      {/* Editor */}
      {phase === "ready" && file && (
        <>
          {/* File header */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="font-mono text-[11px] text-slate-400">
                {formatBytes(file.size)} · {pageSizes.length} page{pageSizes.length !== 1 ? "s" : ""} · {Math.round(currentPageSize.width)}×{Math.round(currentPageSize.height)} pt
              </p>
            </div>
            <button onClick={reset} className="shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors">Change</button>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* Controls */}
            <div className="flex-1 space-y-4">

              {/* Kind toggle */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
                <button
                  onClick={() => setActiveKind("text")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${activeKind === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <PenLine className="h-4 w-4" /> Add Text
                </button>
                <button
                  onClick={() => setActiveKind("image")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${activeKind === "image" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <ImagePlus className="h-4 w-4" /> Image Stamp
                </button>
              </div>

              {/* Text controls */}
              {activeKind === "text" && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="space-y-4 px-5 py-5">
                    <input
                      type="text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {/* Size + Bold + Italic */}
                    <div className="flex items-center gap-2">
                      <select
                        value={draftSize}
                        onChange={(e) => setDraftSize(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}pt</option>)}
                      </select>
                      <button onClick={() => setDraftBold((v) => !v)} className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${draftBold ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>B</button>
                      <button onClick={() => setDraftItalic((v) => !v)} className={`rounded-lg border px-3 py-2 text-sm italic transition-colors ${draftItalic ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>I</button>
                    </div>
                    {/* Color */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-600">Color</p>
                      <div className="flex gap-2">
                        {COLORS.map((c) => (
                          <button key={c.hex} onClick={() => setDraftColor(c.hex)} title={c.label}
                            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${draftColor === c.hex ? "border-slate-500 scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c.bg }} />
                        ))}
                      </div>
                    </div>
                    {/* Rotation */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-600">Rotation</p>
                      <div className="flex gap-1.5">
                        {ROTATIONS.map((r) => (
                          <button key={r} onClick={() => setDraftRotation(r)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${draftRotation === r ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            {r}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image stamp controls */}
              {activeKind === "image" && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="space-y-4 px-5 py-5">
                    {/* Image picker */}
                    {!draftImage ? (
                      <button
                        onClick={() => imgInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <ImagePlus className="h-5 w-5" />
                        Pick image (PNG, JPG, WEBP · max 10 MB)
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={draftImageUrl!} alt="" className="h-12 w-12 rounded object-cover border border-slate-200" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-800">{draftImage.name}</p>
                          <p className="text-[11px] text-slate-400">{formatBytes(draftImage.size)}</p>
                        </div>
                        <button onClick={() => { if (draftImageUrl) URL.revokeObjectURL(draftImageUrl); setDraftImage(null); setDraftImageUrl(null); }}
                          className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                    )}

                    {/* Width / Height */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Width (pt)</label>
                        <input type="number" min={10} max={2000} value={draftImgW} onChange={(e) => setDraftImgW(Math.max(10, Number(e.target.value)))}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Height (pt)</label>
                        <input type="number" min={10} max={2000} value={draftImgH} onChange={(e) => setDraftImgH(Math.max(10, Number(e.target.value)))}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                      </div>
                    </div>

                    {/* Rotation */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-600">Rotation</p>
                      <div className="flex gap-1.5">
                        {ROTATIONS.map((r) => (
                          <button key={r} onClick={() => setDraftImgRotation(r)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${draftImgRotation === r ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            {r}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page picker */}
              {pageSizes.length > 1 && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-600">Page</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setPendingPos(null); }} disabled={currentPage === 1}
                      className="h-7 w-7 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40">‹</button>
                    <span className="min-w-[4rem] text-center text-sm font-medium text-slate-700">{currentPage} / {pageSizes.length}</span>
                    <button onClick={() => { setCurrentPage((p) => Math.min(pageSizes.length, p + 1)); setPendingPos(null); }} disabled={currentPage === pageSizes.length}
                      className="h-7 w-7 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40">›</button>
                  </div>
                </div>
              )}

              {/* Pending position confirm */}
              {pendingPos ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
                  <p className="text-xs font-semibold text-blue-700">Position: ({pendingPos.x}, {pendingPos.y}) pt</p>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={placeAnnotation}
                      disabled={activeKind === "text" ? !draftText.trim() : !draftImage}
                      size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50">
                      Place {activeKind === "text" ? "text" : "stamp"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingPos(null)} className="text-xs">Cancel</Button>
                  </div>
                  {activeKind === "text" && !draftText.trim() && <p className="mt-2 text-xs text-blue-600">↑ Enter text above first.</p>}
                  {activeKind === "image" && !draftImage && <p className="mt-2 text-xs text-blue-600">↑ Pick an image above first.</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <MousePointer className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-xs text-slate-500">Click anywhere on the page preview to place your {activeKind === "text" ? "text" : "stamp"}.</p>
                </div>
              )}

              {/* Annotation list */}
              {annotations.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{annotations.length} annotation{annotations.length > 1 ? "s" : ""}</p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {annotations.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                        {a.kind === "text" ? (
                          <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `#${a.fontColor}` }} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.localUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover border border-slate-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          {a.kind === "text" ? (
                            <p className="truncate text-sm text-slate-800" style={{ fontWeight: a.bold ? "bold" : "normal", fontStyle: a.italic ? "italic" : "normal" }}>{a.text}</p>
                          ) : (
                            <p className="truncate text-sm text-slate-800">{a.imageFile.name}</p>
                          )}
                          <p className="text-[11px] text-slate-400">
                            p.{a.page} · ({a.x}, {a.y}) {a.kind === "text" ? `· ${a.fontSize}pt` : `· ${a.width}×${a.height} pt`} {a.rotation > 0 ? `· ${a.rotation}°` : ""}
                          </p>
                        </div>
                        <button onClick={() => removeAnnotation(a.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                    <p className="text-xs text-slate-400">1 credit will be used</p>
                    <Button onClick={handleApply} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                      <PenLine className="h-4 w-4" /> Apply to PDF
                    </Button>
                  </div>
                </div>
              )}

              {/* Processing error — cast bypasses TS narrowing from the outer phase==="ready" check */}
              {(phase as string) === "error" && errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <p className="text-sm font-semibold text-red-700">Something went wrong</p>
                  <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
                  <button onClick={() => { setPhase("ready"); setErrorMsg(null); }} className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline">Try again</button>
                </div>
              )}
            </div>

            {/* PDF preview */}
            <div className="shrink-0">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Page {currentPage} — click to place
                {rendering && <span className="ml-2 text-slate-400">rendering…</span>}
              </p>
              <div
                className="relative cursor-crosshair rounded-lg border border-slate-300 shadow-md overflow-hidden"
                style={{ width: PREVIEW_CSS_WIDTH, height: previewCssH }}
                onClick={handleCanvasClick}
              >
                {/* Rendered PDF */}
                <canvas ref={canvasRef} className="absolute inset-0 block" />

                {/* Text annotation overlays */}
                {annotations.filter((a) => a.page === currentPage && a.kind === "text").map((a) => {
                  const ta = a as TextAnnotation;
                  return (
                    <div key={a.id} className="pointer-events-none absolute" style={{
                      left: Math.round(a.x * scale), top: Math.round(a.y * scale),
                      fontSize: Math.max(8, Math.round(ta.fontSize * scale)),
                      color: `#${ta.fontColor}`,
                      fontWeight: ta.bold ? "bold" : "normal",
                      fontStyle: ta.italic ? "italic" : "normal",
                      lineHeight: 1, whiteSpace: "nowrap",
                      backgroundColor: "rgba(255,255,255,0.55)", padding: "0 1px", borderRadius: 2,
                      transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
                      transformOrigin: "top left",
                    }}>{ta.text}</div>
                  );
                })}

                {/* Image stamp overlays */}
                {annotations.filter((a) => a.page === currentPage && a.kind === "image").map((a) => {
                  const ia = a as ImageAnnotation;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.id} src={ia.localUrl} alt="" className="pointer-events-none absolute object-contain opacity-80"
                      style={{
                        left: Math.round(a.x * scale), top: Math.round(a.y * scale),
                        width: Math.round(ia.width * scale), height: Math.round(ia.height * scale),
                        transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
                        transformOrigin: "top left",
                      }} />
                  );
                })}

                {/* Pending crosshair + live preview */}
                {pendingPos && (
                  <>
                    <div className="pointer-events-none absolute" style={{ left: Math.round(pendingPos.x * scale) - 10, top: Math.round(pendingPos.y * scale), width: 20, height: 1.5, backgroundColor: "#2563EB" }} />
                    <div className="pointer-events-none absolute" style={{ left: Math.round(pendingPos.x * scale), top: Math.round(pendingPos.y * scale) - 10, width: 1.5, height: 20, backgroundColor: "#2563EB" }} />
                    {activeKind === "text" && draftText && (
                      <div className="pointer-events-none absolute opacity-60" style={{
                        left: Math.round(pendingPos.x * scale), top: Math.round(pendingPos.y * scale),
                        fontSize: Math.max(8, Math.round(draftSize * scale)), color: `#${draftColor}`,
                        fontWeight: draftBold ? "bold" : "normal", fontStyle: draftItalic ? "italic" : "normal",
                        lineHeight: 1, whiteSpace: "nowrap",
                        backgroundColor: "rgba(255,255,255,0.55)", padding: "0 1px", borderRadius: 2,
                        transform: draftRotation ? `rotate(${draftRotation}deg)` : undefined, transformOrigin: "top left",
                      }}>{draftText}</div>
                    )}
                    {activeKind === "image" && draftImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draftImageUrl} alt="" className="pointer-events-none absolute object-contain opacity-50"
                        style={{
                          left: Math.round(pendingPos.x * scale), top: Math.round(pendingPos.y * scale),
                          width: Math.round(draftImgW * scale), height: Math.round(draftImgH * scale),
                          transform: draftImgRotation ? `rotate(${draftImgRotation}deg)` : undefined, transformOrigin: "top left",
                        }} />
                    )}
                  </>
                )}

                {/* Page size label */}
                <div className="pointer-events-none absolute bottom-1.5 right-2 font-mono text-[9px] text-slate-400 bg-white/70 px-1 rounded">
                  {Math.round(currentPageSize.width)}×{Math.round(currentPageSize.height)} pt
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); }} />

      <p className="text-center text-xs text-slate-400">
        Files are encrypted in transit and automatically deleted after 1 hour.
      </p>
    </div>
  );
}
