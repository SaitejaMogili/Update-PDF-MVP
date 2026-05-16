"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Download, CheckCircle, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

type Phase = "idle" | "saving" | "generating" | "done" | "error";

interface LineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface FormState {
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

interface LogoState {
  base64: string;
  mimeType: "image/png" | "image/jpeg";
  preview: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  fromName: string;
  fromAddress?: string;
  fromEmail?: string;
  fromPhone?: string;
  toName: string;
  toAddress?: string;
  toEmail?: string;
  lineItems: Array<{ description: string; quantity: number; unitPriceCents: number }>;
  taxRateBps: number;
  notes?: string;
  currency: string;
  logoBase64?: string;
  logoMimeType?: "image/png" | "image/jpeg";
}

interface InvoiceFormProps {
  initialData?: InvoiceData;
  invoiceId?: string;
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
const MAX_LOGO_BYTES = 400_000; // 400 KB

function initialFormFromData(data?: InvoiceData): FormState {
  if (!data) {
    const t = today();
    return {
      invoiceNumber: "INV-001",
      invoiceDate: t,
      dueDate: addDays(t, 30),
      fromName: "", fromAddress: "", fromEmail: "", fromPhone: "",
      toName: "", toAddress: "", toEmail: "",
      taxRate: "0", notes: "", currency: "USD",
    };
  }
  return {
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate ?? "",
    fromName: data.fromName,
    fromAddress: data.fromAddress ?? "",
    fromEmail: data.fromEmail ?? "",
    fromPhone: data.fromPhone ?? "",
    toName: data.toName,
    toAddress: data.toAddress ?? "",
    toEmail: data.toEmail ?? "",
    taxRate: String(data.taxRateBps / 100),
    notes: data.notes ?? "",
    currency: data.currency,
  };
}

function initialItemsFromData(data?: InvoiceData): LineItemRow[] {
  if (!data || !data.lineItems.length) {
    return [{ id: uid(), description: "", quantity: "1", unitPrice: "" }];
  }
  return data.lineItems.map(li => ({
    id: uid(),
    description: li.description,
    quantity: String(li.quantity),
    unitPrice: String(li.unitPriceCents / 100),
  }));
}

export function InvoiceForm({ initialData, invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [form, setForm] = useState<FormState>(() => initialFormFromData(initialData));
  const [items, setItems] = useState<LineItemRow[]>(() => initialItemsFromData(initialData));
  const [logo, setLogo] = useState<LogoState | null>(() => {
    if (initialData?.logoBase64 && initialData.logoMimeType) {
      return {
        base64: initialData.logoBase64,
        mimeType: initialData.logoMimeType,
        preview: `data:${initialData.logoMimeType};base64,${initialData.logoBase64}`,
      };
    }
    return null;
  });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(invoiceId ?? null);
  const [justSaved, setJustSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = (f: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const setItem = (id: string, f: keyof Omit<LineItemRow, "id">) => (e: React.ChangeEvent<HTMLInputElement>) =>
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

  // Logo upload handler
  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      alert("Only PNG or JPEG logos are supported.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      alert(`Logo must be under 400 KB. Your file is ${Math.round(file.size / 1024)} KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Extract base64 part only (strip "data:image/png;base64," prefix)
      const base64 = dataUrl.split(",")[1];
      setLogo({
        base64,
        mimeType: file.type as "image/png" | "image/jpeg",
        preview: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const buildRequestBody = () => ({
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
    logoBase64: logo?.base64,
    logoMimeType: logo?.mimeType,
  });

  const handleSaveDraft = async () => {
    if (!canSubmit) return;
    setPhase("saving");
    setErrorMsg(null);

    try {
      if (savedId) {
        // Update existing draft
        const res = await fetch(`/api/invoices/${savedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody()),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      } else {
        // Create new draft
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "draft", ...buildRequestBody() }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
        const { id } = await res.json();
        setSavedId(id);
        // Update URL to the edit page without full navigation
        router.replace(`/app/tools/invoice/${id}`);
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      setPhase("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setPhase("error");
    }
  };

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setPhase("generating");
    setErrorMsg(null);

    try {
      let res: Response;

      if (savedId) {
        // Generate from existing saved invoice
        res = await fetch(`/api/invoices/${savedId}/generate`, { method: "POST" });
      } else {
        // Generate directly (also saves to DB)
        res = await fetch("/api/tools/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody()),
        });
      }

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

  const reset = () => {
    setPhase("idle");
    setDownloadUrl(null);
    setOutputFilename(null);
    setErrorMsg(null);
  };

  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Invoice ready!</h2>
        <p className="mb-6 text-sm text-slate-500">
          Invoice {form.invoiceNumber} for {fmtMoney(totalCents, form.currency)}
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download={outputFilename ?? "invoice.pdf"}>
            <Button className="gap-2 text-white" style={{ background: FIN_GRADIENT }}>
              <Download className="h-4 w-4" /> Download invoice PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Edit invoice</Button>
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

      {/* ── Logo upload ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">
            Company logo <span className="font-normal text-slate-400">(optional — PNG or JPEG, max 400 KB)</span>
          </p>
        </div>
        <div className="px-5 py-4">
          {logo ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.preview}
                alt="Logo preview"
                className="h-14 max-w-[160px] object-contain rounded border border-slate-200 bg-slate-50 p-1"
              />
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Logo uploaded</p>
                <button
                  onClick={() => setLogo(null)}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-red-300 hover:text-slate-700 transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              Click to upload logo
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
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

      {/* ── Error ─────────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <p className="text-xs text-slate-400">1 credit for generation</p>
          {justSaved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!canSubmit || phase === "saving"}
            className="gap-2 disabled:opacity-50"
          >
            {phase === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save draft
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canSubmit || phase === "saving"}
            className="gap-2 text-white disabled:opacity-50"
            style={{ background: FIN_GRADIENT }}
          >
            Generate PDF
          </Button>
        </div>
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
