"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  CheckCircle,
  Download,
  RefreshCw,
  Loader2,
  Info,
  Sparkles,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import type { TemplateDefinition, TemplateField } from "@/lib/templates/registry";

// Use string so TypeScript doesn't narrow the type in JSX after early-return checks
type Phase = string;

type ScalarValue = string;
type ArrayItem = Record<string, ScalarValue>;
type FieldValue = ScalarValue | ArrayItem[];

interface Props {
  template: TemplateDefinition;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function initFieldValue(field: TemplateField): FieldValue {
  if (field.type === "array") {
    const emptyItem: ArrayItem = {};
    for (const sf of field.subFields ?? []) {
      emptyItem[sf.key] = sf.type === "select" && sf.options?.length ? sf.options[0] : "";
    }
    return field.required ? [emptyItem] : [];
  }
  if (field.type === "date") return today();
  if (field.type === "select" && field.options?.length) return field.options[0];
  return "";
}

function initValues(template: TemplateDefinition): Record<string, FieldValue> {
  const vals: Record<string, FieldValue> = {};
  for (const field of template.fields) {
    vals[field.key] = initFieldValue(field);
  }
  return vals;
}

// ── Sub-components ────────────────────────────────────────────────

function FieldHint({ hint }: { hint: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-violet-600">
      <Sparkles className="h-3 w-3 flex-shrink-0" />
      {hint}
    </p>
  );
}

function FieldWrapper({
  field,
  children,
}: {
  field: TemplateField;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {field.hint && <FieldHint hint={field.hint} />}
    </div>
  );
}

interface ScalarInputProps {
  field: TemplateField;
  value: ScalarValue;
  onChange: (v: ScalarValue) => void;
}

function ScalarInput({ field, value, onChange }: ScalarInputProps) {
  const baseClass =
    "block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
      >
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={field.rows ?? 3}
        placeholder={field.placeholder}
        className={`${baseClass} resize-y`}
      />
    );
  }

  return (
    <input
      type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={baseClass}
    />
  );
}

interface ArrayFieldProps {
  field: TemplateField;
  items: ArrayItem[];
  onChange: (items: ArrayItem[]) => void;
}

function ArrayField({ field, items, onChange }: ArrayFieldProps) {
  const subFields = field.subFields ?? [];
  const maxItems = field.maxItems ?? 50;

  const addItem = () => {
    if (items.length >= maxItems) return;
    const emptyItem: ArrayItem = {};
    for (const sf of subFields) {
      emptyItem[sf.key] = sf.type === "select" && sf.options?.length ? sf.options[0] : "";
    }
    onChange([...items, emptyItem]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, val: string) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, [key]: val } : item
    );
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {items.length < maxItems && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {field.label.replace(/s$/, "")}
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
          No items yet. Click &ldquo;Add&rdquo; to get started.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="relative rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div
              className={`grid gap-2 pr-6 ${
                subFields.length === 1
                  ? "grid-cols-1"
                  : subFields.length === 2
                  ? "grid-cols-2"
                  : subFields.length >= 3
                  ? "grid-cols-1 sm:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {subFields.map((sf) => (
                <div key={sf.key} className="space-y-0.5">
                  <label className="block text-xs font-medium text-slate-500">
                    {sf.label}
                    {sf.required && <span className="ml-0.5 text-red-400">*</span>}
                  </label>
                  {sf.type === "select" ? (
                    <select
                      value={item[sf.key] ?? ""}
                      onChange={(e) => updateItem(idx, sf.key, e.target.value)}
                      className="block w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      {sf.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : sf.type === "textarea" ? (
                    <textarea
                      value={item[sf.key] ?? ""}
                      onChange={(e) => updateItem(idx, sf.key, e.target.value)}
                      rows={sf.rows ?? 2}
                      placeholder={sf.placeholder}
                      className="block w-full resize-y rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      type={
                        sf.type === "number"
                          ? "number"
                          : sf.type === "date"
                          ? "date"
                          : "text"
                      }
                      value={item[sf.key] ?? ""}
                      onChange={(e) => updateItem(idx, sf.key, e.target.value)}
                      placeholder={sf.placeholder}
                      className="block w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                  {sf.hint && (
                    <p className="flex items-center gap-0.5 text-xs text-violet-500">
                      <Sparkles className="h-2.5 w-2.5" />
                      {sf.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────

export function TemplateEditor({ template }: Props) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    initValues(template)
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const setScalar = useCallback((key: string, val: ScalarValue) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setArray = useCallback((key: string, items: ArrayItem[]) => {
    setValues((prev) => ({ ...prev, [key]: items }));
  }, []);

  const isValid = () => {
    for (const field of template.fields) {
      if (!field.required) continue;
      const val = values[field.key];
      if (field.type === "array") {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else {
        if (!val || (val as string).trim() === "") return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;

    setPhase("generating");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/templates/${template.slug}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });

      const data = (await res.json()) as {
        downloadUrl?: string;
        filename?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed");
      }

      setDownloadUrl(data.downloadUrl ?? null);
      setFilename(data.filename ?? `${template.slug}.pdf`);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const handleReset = () => {
    setValues(initValues(template));
    setPhase("idle");
    setDownloadUrl(null);
    setErrorMsg("");
  };

  // ── Done state ─────────────────────────────────────────────────
  if (phase === "done" && downloadUrl) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">Your PDF is ready!</h2>
        <p className="mb-6 text-sm text-slate-500">
          {filename} — download link valid for 1 hour.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #34D399 100%)",
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Generate another
          </button>
        </div>
        <div className="mt-6">
          <Link
            href="/templates"
            className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to templates
          </Link>
        </div>
      </div>
    );
  }

  // ── Generating state ───────────────────────────────────────────
  if (phase === "generating") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-50">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900">
          Generating your {template.name}…
        </h2>
        {template.isAiAssisted && (
          <p className="text-sm text-violet-600">AI is enhancing your content</p>
        )}
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI banner */}
      {template.isAiAssisted && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" />
          <p className="text-sm text-violet-700">
            <strong>AI Enhanced</strong> — Fields marked with{" "}
            <Sparkles className="inline h-3 w-3" /> will be refined by AI before
            generating your PDF for more professional output.
          </p>
        </div>
      )}

      {/* Error banner */}
      {phase === "error" && errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Form card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {template.fields.map((field) => {
            if (field.type === "array") {
              return (
                <ArrayField
                  key={field.key}
                  field={field}
                  items={(values[field.key] as ArrayItem[]) ?? []}
                  onChange={(items) => setArray(field.key, items)}
                />
              );
            }

            return (
              <FieldWrapper key={field.key} field={field}>
                <ScalarInput
                  field={field}
                  value={(values[field.key] as ScalarValue) ?? ""}
                  onChange={(v) => setScalar(field.key, v)}
                />
              </FieldWrapper>
            );
          })}
        </div>
      </div>

      {/* Submit footer */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong className="text-slate-700">{template.credits} credit{template.credits !== 1 ? "s" : ""}</strong> will be used
            {template.isAiAssisted ? " • AI will enhance your content" : ""}
          </span>
        </div>
        <button
          type="submit"
          disabled={!isValid() || phase === "generating"}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #059669 0%, #34D399 100%)",
          }}
        >
          {phase === "generating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate PDF"
          )}
        </button>
      </div>
    </form>
  );
}
