"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Loader2, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import type { BrainDocument } from "./brain-workspace";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";
const MAX_SIZE = 20 * 1024 * 1024;

interface Props {
  workspaceId: string;
  documents: BrainDocument[];
  onDocumentsChange: (docs: BrainDocument[]) => void;
}

function StatusBadge({ status }: { status: BrainDocument["status"] }) {
  const config = {
    pending: { label: "Pending", className: "bg-slate-100 text-slate-500", icon: Clock },
    ingesting: { label: "Ingesting…", className: "bg-amber-50 text-amber-700 border border-amber-200", icon: Loader2 },
    ready: { label: "Ready", className: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 },
    failed: { label: "Failed", className: "bg-red-50 text-red-700 border border-red-200", icon: XCircle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
      <Icon className={`h-2.5 w-2.5 ${status === "ingesting" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function BrainDocuments({ workspaceId, documents: initial, onDocumentsChange }: Props) {
  const [documents, setDocuments] = useState<BrainDocument[]>(initial);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateDocs = (newDocs: BrainDocument[]) => {
    setDocuments(newDocs);
    onDocumentsChange(newDocs);
  };

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("File exceeds 20MB limit.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    // Optimistic pending entry
    const optimisticId = `opt-${Date.now()}`;
    const optimisticDoc: BrainDocument = {
      id: optimisticId,
      filename: file.name,
      page_count: null,
      chunk_count: 0,
      status: "ingesting",
      error_message: null,
      created_at: new Date().toISOString(),
      file_id: null,
    };
    const withOptimistic = [optimisticDoc, ...documents];
    updateDocs(withOptimistic);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch(`/api/brain/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const newDoc: BrainDocument = json.document;
      updateDocs([newDoc, ...documents]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      updateDocs(documents); // revert optimistic
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/brain/workspaces/${workspaceId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      const newDocs = documents.filter((d) => d.id !== docId);
      updateDocs(newDocs);
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: BRAIN_GRADIENT }}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>
        <p className="mb-1 text-sm font-semibold text-slate-900">
          {uploading ? "Ingesting document…" : "Drop a PDF here to add to this workspace"}
        </p>
        <p className="text-xs text-slate-500">
          {uploading ? "Embedding chunks into your Brain library" : "or click to browse — PDF only, max 20MB"}
        </p>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No documents yet — drop a PDF above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: BRAIN_GRADIENT }}
              >
                <FileText className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                  {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                  {doc.page_count && <span>{doc.page_count} pages</span>}
                  <span>{formatDate(doc.created_at)}</span>
                </div>
                {doc.status === "failed" && doc.error_message && (
                  <p className="mt-0.5 text-xs text-red-600">{doc.error_message}</p>
                )}
              </div>

              {/* Delete */}
              {confirmDeleteId === doc.id ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {deletingId === doc.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(doc.id)}
                  className="shrink-0 rounded p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
