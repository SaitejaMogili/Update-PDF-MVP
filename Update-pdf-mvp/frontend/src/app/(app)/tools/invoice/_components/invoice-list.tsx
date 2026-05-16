"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Edit, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceSummary {
  id: string;
  status: "draft" | "generated";
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  to_name: string;
  currency: string;
  total_cents: number;
  created_at: string;
  updated_at: string;
  output_file_id: string | null;
}

interface InvoiceListProps {
  invoices: InvoiceSummary[];
}

function fmtMoney(cents: number, currency: string) {
  const syms: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", INR: "₹" };
  return (syms[currency] ?? currency + " ") + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

export function InvoiceList({ invoices: initialInvoices }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>(initialInvoices);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      const res = await fetch(`/api/invoices/${id}/generate`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? "Generation failed");
        return;
      }
      const { downloadUrl, filename } = await res.json();
      // Update status in list
      setInvoices(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: "generated" } : inv)
      );
      // Trigger download
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename ?? "invoice.pdf";
      a.click();
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = async (id: string) => {
    // Re-generate to get a fresh signed URL (existing ones may have expired)
    await handleGenerate(id);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? "Delete failed");
        return;
      }
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-8 py-14 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No invoices yet</p>
        <p className="mt-1 text-xs text-slate-400">Create your first invoice to get started.</p>
        <div className="mt-4">
          <Link href="/tools/invoice/new">
            <Button size="sm" className="text-white" style={{ background: "linear-gradient(135deg, #DC2626 0%, #F87171 100%)" }}>
              New invoice
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map(inv => (
        <div
          key={inv.id}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        >
          {/* Left: info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <FileText className="h-4 w-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900">{inv.invoice_number}</span>
                <StatusBadge status={inv.status} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">{inv.to_name}</p>
              <p className="mt-0.5 text-xs text-slate-400">{fmtDate(inv.invoice_date)}</p>
            </div>
          </div>

          {/* Right: amount + actions */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <span className="text-sm font-bold text-slate-900">
              {fmtMoney(inv.total_cents, inv.currency)}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Edit */}
              <Link href={`/tools/invoice/${inv.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </Link>

              {/* Generate (for drafts) */}
              {inv.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => handleGenerate(inv.id)}
                  disabled={generating === inv.id}
                  className="gap-1.5 text-xs h-8 text-white"
                  style={{ background: "linear-gradient(135deg, #DC2626 0%, #F87171 100%)" }}
                >
                  {generating === inv.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : null}
                  Generate
                </Button>
              )}

              {/* Download (for generated) */}
              {inv.status === "generated" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(inv.id)}
                  disabled={generating === inv.id}
                  className="gap-1.5 text-xs h-8"
                >
                  {generating === inv.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Download className="h-3 w-3" />}
                  Download
                </Button>
              )}

              {/* Delete */}
              {confirmDelete === inv.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(inv.id)}
                    disabled={deleting === inv.id}
                    className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {deleting === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(inv.id)}
                  className="rounded p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Delete invoice"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "generated" }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Generated
    </span>
  );
}
