"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Trash2, ArrowRight, Plus, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";

interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  file_ids: string[];
  doc_count: number;
  updated_at: string;
}

interface Props {
  workspaces: Workspace[];
}

export function WorkspaceList({ workspaces: initial }: Props) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openModal = () => {
    setName("");
    setDescription("");
    setCreateError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/brain/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create workspace");
      router.push(`/app/brain/${json.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/brain/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // silently fail — user will see workspace still in list
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* New Workspace button */}
      <div className="flex justify-end">
        <Button
          onClick={openModal}
          className="gap-2 text-white"
          style={{ background: BRAIN_GRADIENT }}
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </Button>
      </div>

      {/* Workspace grid */}
      {workspaces.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: BRAIN_GRADIENT }}
                  >
                    <Brain className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 leading-tight truncate max-w-36">
                    {ws.name}
                  </h3>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(ws.id)}
                  className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {ws.description && (
                <p className="mb-3 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {ws.description}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                <FileText className="h-3 w-3" />
                <span>{ws.doc_count} document{ws.doc_count !== 1 ? "s" : ""}</span>
              </div>

              <button
                onClick={() => router.push(`/app/brain/${ws.id}`)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                Open workspace
                <ArrowRight className="h-3 w-3" />
              </button>

              {/* Confirm delete overlay */}
              {confirmDeleteId === ws.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/95 backdrop-blur-sm border border-red-200">
                  <p className="text-sm font-semibold text-slate-800">Delete &ldquo;{ws.name}&rdquo;?</p>
                  <p className="text-xs text-slate-500 text-center px-4">
                    All documents and chat history will be permanently deleted.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(ws.id)}
                      disabled={deletingId === ws.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {deletingId === ws.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create workspace modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ background: BRAIN_GRADIENT }}
                >
                  <Brain className="h-4 w-4" />
                </div>
                <h2 className="font-semibold text-slate-900">New Brain Workspace</h2>
              </div>
              <button
                onClick={closeModal}
                className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Workspace name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Q4 Contracts, HR Policies 2024"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  placeholder="What documents will you store here?"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button variant="outline" onClick={closeModal} disabled={creating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="gap-2 text-white disabled:opacity-50"
                style={{ background: BRAIN_GRADIENT }}
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
