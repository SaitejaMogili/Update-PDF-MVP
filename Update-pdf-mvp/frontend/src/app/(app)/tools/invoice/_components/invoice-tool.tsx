"use client";

import { useState } from "react";
import { Plus, Trash2, Download, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

type Phase = "idle" | "generating" | "done" | "error";

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceForm {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  fromName: string;
  fromAddress: string;
  fromEmail: string;
  fromPhone: string;
  toName: string;
  toAddress: string;
  toEmail: string;
  taxRate: string;
  notes: string;
  currency: string;
}

function today(): string { return new Date().toISOString().slice(0, 10); }
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function uid() { return Math.random().toString(36).slice(2); }
function parseCents(v: string) { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : Math.round(n * 100); }
function fmtMoney(cents: number, currency: string) {
  const syms: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", INR: "₹" };
  return (syms[currency] ?? currency + " ") + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"];

export function InvoiceTool() {
  const t = today();
  const [phase, setPhase] = useState<Phase>("idle");
  const [form, setForm] = useState<InvoiceForm>({
    invoiceNumber: "INV-001",
    invoiceDate: t,
    dueDate: addDays(t, 30),
    fromName: "", fromAddress: "", fromEmail: "", fromPhone: "",
    toName: "", toAddress: "", toEmail: "",
    taxRate: "0", notes: "", currency: "USD",
  });
  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: "", quantity: "1", unitPrice: "" },
  ]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = (f: keyof InvoiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const setItem = (id: string, f: keyof Omit<LineItem, "id">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [f]: e.target.value } : i));

  const addItem = () => setItems(p => [...p, { id: uid(), description: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  // Totals
  const subtotalCents = items.reduce((s, i) => s + Math.round((parseFloat(i.quantity) || 0) * parseCents(i.unitPrice)), 0);
  const taxRateBps = Math.round((parseFloat(form.taxRate) || 0) * 100);
  const taxCents = Math.round(subtotalCents * taxRateBps / 10_000);
  const totalCents = subtotalCents + taxCents;

  const canSubmit = form.fromName.trim() && form.toName.trim() &&
    items.some(i => i.description.trim() && parseCents(i.unitPrice) > 0);

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setPhase("generating");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tools/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate || undefined,
          fromName: form.fromName,
          fromAddress: form.fromAddress || undefined,
          fromEmail: form.fromEmail || undefined,
          fromPhone: form.fromPhone || undefined,
          toName: form.toName,
          toAddress: form.toAddress || undefined,
          toEmail: form.toEmail || undefined,
          lineItems: items
            .filter(i => i.description.trim() && parseCents(i.unitPrice) > 0)
            .map(i => ({
              description: i.description,
              quantity: parseFloat(i.quantity) || 1,
              unitPriceCents: parseCents(i.unitPrice),
            })),
          taxRateBps,
          notes: form.notes || undefined,
          currency: form.currency,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const { downloadUrl: url, filename } = await res.json();
      setDownloadUrl(url);
      setOutputFilename(filename);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const reset = () => { setPhase("idle"); setDownloadUrl(null); setOutputFilename(null); setErrorMsg(null); };

  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Invoice ready!</h2>
        <p className="mb-6 text-sm text-slate-500">Invoice {form.invoiceNumber} for {fmtMoney(totalCents, form.currency)}</p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download={outputFilename ?? "invoice.pdf"}>
            <Button className="gap-2 text-white" style={{ background: FIN_GRADIENT }}>
              <Download className="h-4 w-4" /> Download invoice PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>New invoice</Button>
        </div>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" style={{ color: "#DC2626" }} />
        <p className="font-semibold text-slate-900">Generating invoice…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Header row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Invoice number *"><input value={form.invoiceNumber} onChange={set("invoiceNumber")} className={iCls} /></Field>
        <Field label="Currency">
          <select value={form.currency} onChange={set("currency")} className={iCls}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Invoice date *"><input type="date" value={form.invoiceDate} onChange={set("invoiceDate")} className={iCls} /></Field>
        <Field label="Due date"><input type="date" value={form.dueDate} onChange={set("dueDate")} className={iCls} /></Field>
      </div>

      {/* ── From / To ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="From (your details)">
          <Field label="Company / Name *"><input value={form.fromName} onChange={set("fromName")} placeholder="Acme Corp" className={iCls} /></Field>
          <Field label="Address"><input value={form.fromAddress} onChange={set("fromAddress")} placeholder="123 Main St, City" className={iCls} /></Field>
          <Field label="Email"><input value={form.fromEmail} onChange={set("fromEmail")} placeholder="billing@acme.com" className={iCls} /></Field>
          <Field label="Phone"><input value={form.fromPhone} onChange={set("fromPhone")} placeholder="+1 555 000 0000" className={iCls} /></Field>
        </Card>
        <Card title="Bill to (client)">
          <Field label="Company / Name *"><input value={form.toName} onChange={set("toName")} placeholder="Client Corp" className={iCls} /></Field>
          <Field label="Address"><input value={form.toAddress} onChange={set("toAddress")} placeholder="456 Oak Ave, City" className={iCls} /></Field>
          <Field label="Email"><input value={form.toEmail} onChange={set("toEmail")} placeholder="accounts@client.com" className={iCls} /></Field>
        </Card>
      </div>

      {/* ── Line items ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Line items</p>
          <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_110px_36px] gap-3 bg-slate-50 border-b border-slate-100 px-5 py-2">
          {["Description", "Qty", "Unit price", ""].map(h => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{h}</p>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const rowTotal = Math.round((parseFloat(item.quantity) || 0) * parseCents(item.unitPrice));
            return (
              <div key={item.id} className="grid grid-cols-[1fr_80px_110px_36px] gap-3 items-center px-5 py-3">
                <input value={item.description} onChange={setItem(item.id, "description")} placeholder="Service or product description" className={iCls} />
                <input value={item.quantity} onChange={setItem(item.id, "quantity")} placeholder="1" className={`${iCls} text-center`} />
                <input value={item.unitPrice} onChange={setItem(item.id, "unitPrice")} placeholder="0.00" className={iCls} />
                <div className="flex items-center justify-end gap-2">
                  {rowTotal > 0 && <span className="text-xs text-slate-500 whitespace-nowrap">{fmtMoney(rowTotal, form.currency)}</span>}
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>{fmtMoney(subtotalCents, form.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <input value={form.taxRate} onChange={set("taxRate")} className="w-14 rounded border border-slate-200 bg-white px-2 py-0.5 text-center text-xs outline-none focus:border-red-300" />
                <span className="text-xs text-slate-400">%</span>
              </div>
              <span>{fmtMoney(taxCents, form.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
              <span>Total</span><span style={{ color: "#DC2626" }}>{fmtMoney(totalCents, form.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></p>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={form.notes}
            onChange={set("notes")}
            rows={3}
            placeholder="Payment terms, bank details, thank you message…"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all placeholder-slate-300"
          />
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">1 credit will be used</p>
        <Button
          onClick={handleGenerate}
          disabled={!canSubmit}
          className="gap-2 text-white disabled:opacity-50"
          style={{ background: FIN_GRADIENT }}
        >
          Generate Invoice PDF
        </Button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

const iCls = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all placeholder-slate-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </div>
  );
}
