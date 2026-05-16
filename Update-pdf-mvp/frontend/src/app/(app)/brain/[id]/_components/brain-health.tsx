"use client";

import type { BrainDocument, Workspace } from "./brain-workspace";

interface Props {
  documents: BrainDocument[];
  workspace: Workspace;
}

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function BrainHealth({ documents, workspace }: Props) {
  const total = documents.length;
  const ready = documents.filter((d) => d.status === "ready").length;
  const failed = documents.filter((d) => d.status === "failed").length;
  const pending = documents.filter((d) => d.status === "pending" || d.status === "ingesting").length;
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count ?? 0), 0);
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count ?? 0), 0);

  const healthScore = total > 0 ? Math.round((ready / total) * 100) : 0;

  const healthColor =
    healthScore >= 80
      ? "text-emerald-600"
      : healthScore >= 50
      ? "text-amber-600"
      : "text-red-600";

  const healthBg =
    healthScore >= 80
      ? "bg-emerald-50 border-emerald-200"
      : healthScore >= 50
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

  const readyPct = total > 0 ? (ready / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Library Health Score */}
      <div className={`flex items-center justify-between rounded-2xl border px-6 py-5 ${healthBg}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Library Health Score</p>
          <p className={`mt-1 text-4xl font-bold ${healthColor}`}>{healthScore}%</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {total === 0
              ? "No documents yet"
              : `${ready} of ${total} documents ready`}
          </p>
        </div>
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{
            background:
              healthScore >= 80
                ? "linear-gradient(135deg, #059669 0%, #34D399 100%)"
                : healthScore >= 50
                ? "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)"
                : "linear-gradient(135deg, #DC2626 0%, #F87171 100%)",
          }}
        >
          {healthScore}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard value={total} label="Total Documents" />
        <StatCard value={totalChunks} label="Chunks Indexed" sub="searchable text blocks" />
        <StatCard value={ready} label="Ready" sub="fully indexed" />
        <StatCard
          value={failed}
          label="Failed"
          sub={failed > 0 ? "check error messages" : "none"}
        />
        <StatCard value={pending} label="Processing" sub="ingesting…" />
        <StatCard value={totalPages || "—"} label="Estimated Pages" />
      </div>

      {/* Status breakdown */}
      {total > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Status Breakdown
          </p>
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {readyPct > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${readyPct}%` }}
                />
              )}
              {pendingPct > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${pendingPct}%` }}
                />
              )}
              {failedPct > 0 && (
                <div
                  className="bg-red-400 transition-all"
                  style={{ width: `${failedPct}%` }}
                />
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Ready ({ready})
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Processing ({pending})
              </div>
              {failed > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-red-600 font-medium">Failed ({failed})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workspace info */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Workspace</p>
        <p className="text-sm font-medium text-slate-800">{workspace.name}</p>
        {workspace.description && (
          <p className="text-xs text-slate-500">{workspace.description}</p>
        )}
        <p className="text-xs text-slate-400">
          Created {new Date(workspace.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Workflow Marketplace stub */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Coming Soon</p>
        <h3 className="font-bold text-lg">Workflow Marketplace</h3>
        <p className="mt-1 text-sm opacity-80">
          Automate document workflows for your Brain workspace — scheduled summaries, compliance
          checks, contract alerts, and more.
        </p>
      </div>
    </div>
  );
}
