"use client";

import { useRef, useState } from "react";
import { Download, CheckCircle, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amountToWords } from "@/lib/tools/cheque-shared";

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

type Phase = "idle" | "generating" | "done" | "error";

interface FormState {
  payee: string;
  amountDollars: string;
  date: string;
  chequeNumber: string;
  memo: string;
  bankName: string;
  bankAddress: string;
  routingNumber: string;
  accountNumber: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCents(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function formatAmount(val: string): string {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ChequeTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [form, setForm] = useState<FormState>({
    payee: "",
    amountDollars: "",
    date: today(),
    chequeNumber: "",
    memo: "",
    bankName: "",
    bankAddress: "",
    routingNumber: "",
    accountNumber: "",
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSignature = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setSignatureFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setSignaturePreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const amountCents = parseCents(form.amountDollars);
  const wordsLine = amountCents > 0
    ? amountToWords(amountCents).toUpperCase() + " DOLLARS"
    : "";

  const canSubmit =
    form.payee.trim().length > 0 &&
    amountCents > 0 &&
    form.date.length === 10;

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setPhase("generating");
    setErrorMsg(null);

    try {
      let signatureBase64: string | undefined;
      let signatureMimeType: "image/png" | "image/jpeg" | undefined;

      if (signatureFile) {
        const buf = await signatureFile.arrayBuffer();
        signatureBase64 = Buffer.from(buf).toString("base64");
        signatureMimeType = signatureFile.type === "image/png" ? "image/png" : "image/jpeg";
      }

      const res = await fetch("/api/tools/cheque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payee: form.payee,
          amountCents,
          date: form.date,
          chequeNumber: form.chequeNumber || undefined,
          memo: form.memo || undefined,
          bankName: form.bankName || undefined,
          bankAddress: form.bankAddress || undefined,
          routingNumber: form.routingNumber || undefined,
          accountNumber: form.accountNumber || undefined,
          signatureBase64,
          signatureMimeType,
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

  const reset = () => {
    setPhase("idle");
    setDownloadUrl(null);
    setOutputFilename(null);
    setErrorMsg(null);
  };

  // ── Done ──────────────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Cheque ready!</h2>
        <p className="mb-6 text-sm text-slate-500">
          Print on cheque paper and sign if you didn't add a digital signature.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={downloadUrl} download={outputFilename ?? "cheque.pdf"}>
            <Button className="gap-2 text-white" style={{ background: FIN_GRADIENT }}>
              <Download className="h-4 w-4" />
              Download cheque PDF
            </Button>
          </a>
          <Button variant="outline" onClick={reset}>Print another</Button>
        </div>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" style={{ color: "#DC2626" }} />
        <p className="font-semibold text-slate-900">Generating cheque…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Form ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">Payment details</p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <Field label="Pay to the order of *">
              <input
                value={form.payee}
                onChange={set("payee")}
                placeholder="Full name or company"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (USD) *">
                <input
                  value={form.amountDollars}
                  onChange={set("amountDollars")}
                  placeholder="0.00"
                  className={inputCls}
                />
              </Field>
              <Field label="Date *">
                <input
                  type="date"
                  value={form.date}
                  onChange={set("date")}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cheque number">
                <input value={form.chequeNumber} onChange={set("chequeNumber")} placeholder="1001" className={inputCls} />
              </Field>
              <Field label="Memo / For">
                <input value={form.memo} onChange={set("memo")} placeholder="Rent, Services…" className={inputCls} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">Bank details <span className="font-normal text-slate-400">(optional)</span></p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <Field label="Bank name">
              <input value={form.bankName} onChange={set("bankName")} placeholder="First National Bank" className={inputCls} />
            </Field>
            <Field label="Bank address">
              <input value={form.bankAddress} onChange={set("bankAddress")} placeholder="123 Main St, City, State" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Routing number">
                <input value={form.routingNumber} onChange={set("routingNumber")} placeholder="000000000" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Account number">
                <input value={form.accountNumber} onChange={set("accountNumber")} placeholder="0000000000" className={`${inputCls} font-mono`} />
              </Field>
            </div>
          </div>
        </div>

        {/* Signature upload */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">Signature <span className="font-normal text-slate-400">(optional)</span></p>
          </div>
          <div className="px-5 py-5">
            {signaturePreview ? (
              <div className="flex items-center gap-3">
                <img src={signaturePreview} alt="Signature" className="h-12 max-w-[200px] rounded border border-slate-200 object-contain bg-white p-1" />
                <button onClick={() => { setSignatureFile(null); setSignaturePreview(null); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => sigInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload signature image (PNG / JPG)
              </button>
            )}
            <input
              ref={sigInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSignature(f); }}
            />
          </div>
        </div>

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
            Generate Cheque PDF
          </Button>
        </div>
      </div>

      {/* ── Live preview ──────────────────────────────────────── */}
      <div className="lg:sticky lg:top-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Live preview</p>
        <ChequePreview form={form} amountCents={amountCents} wordsLine={wordsLine} signaturePreview={signaturePreview} />
        <p className="mt-2 text-center text-xs text-slate-400">
          Print on standard cheque paper (8.5" × 3.5")
        </p>
      </div>
    </div>
  );
}

// ── Cheque preview card ────────────────────────────────────────

function ChequePreview({
  form,
  amountCents,
  wordsLine,
  signaturePreview,
}: {
  form: FormState;
  amountCents: number;
  wordsLine: string;
  signaturePreview: string | null;
}) {
  const amountStr = amountCents > 0
    ? `$ ${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$ ______";

  const dateDisplay = form.date
    ? form.date.split("-").slice(1).concat(form.date.split("-")[0]).join("/")
    : "__/__/____";

  return (
    <div className="w-full rounded-xl border border-slate-300 bg-white shadow-md overflow-hidden font-mono text-[11px]">
      {/* Accent bar */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "linear-gradient(135deg, #DC2626 0%, #F87171 100%)" }}>
        <span className="text-[10px] font-bold tracking-wider text-white uppercase">
          {form.bankName || "YOUR BANK NAME"}
        </span>
        {form.chequeNumber && (
          <span className="text-[10px] text-white/80">No. {form.chequeNumber}</span>
        )}
      </div>

      <div className="px-4 pt-2 pb-1 space-y-1.5">
        {/* Bank address + Date */}
        <div className="flex justify-between items-start">
          <span className="text-slate-400 text-[9px]">{form.bankAddress || ""}</span>
          <div className="text-right">
            <span className="text-[8px] text-slate-400 mr-1">DATE</span>
            <span className="text-slate-700">{dateDisplay}</span>
          </div>
        </div>

        {/* Pay to + amount */}
        <div className="flex items-end justify-between gap-2 border-b border-slate-200 pb-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-[8px] text-slate-400 mb-0.5">PAY TO THE ORDER OF</p>
            <p className="font-bold text-slate-800 truncate text-[12px]">
              {form.payee || <span className="text-slate-300">Payee Name</span>}
            </p>
          </div>
          <div className="shrink-0 border border-red-400 rounded px-2 py-0.5 text-slate-800 font-bold text-[12px]">
            {amountStr}
          </div>
        </div>

        {/* Amount in words */}
        <p className="border-b border-slate-200 pb-1.5 text-slate-700 text-[10px] truncate">
          {wordsLine || <span className="text-slate-300">Amount in words</span>}
        </p>

        {/* Memo + Signature */}
        <div className="flex items-end justify-between pb-1">
          <div>
            <span className="text-[8px] text-slate-400 mr-1">FOR</span>
            <span className="text-slate-600">{form.memo || ""}</span>
          </div>
          <div className="text-right border-t border-slate-800 pt-0.5 min-w-[100px]">
            {signaturePreview
              ? <img src={signaturePreview} alt="sig" className="h-6 max-w-[100px] object-contain ml-auto" />
              : <span className="text-[8px] text-slate-400">AUTHORIZED SIGNATURE</span>}
          </div>
        </div>

        {/* MICR line */}
        <div className="bg-slate-50 -mx-4 px-4 py-1 border-t border-slate-100">
          <p className="text-[9px] text-slate-400">
            ⑆{form.routingNumber || "000000000"}⑆ &nbsp;
            {form.accountNumber || "0000000000"}⑆ &nbsp;
            {form.chequeNumber?.padStart(4, "0") || "0001"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all placeholder-slate-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}
