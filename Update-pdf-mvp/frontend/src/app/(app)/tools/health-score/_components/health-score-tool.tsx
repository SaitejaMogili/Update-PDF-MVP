"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Activity,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HealthScoreResult, CategoryScore } from "@/lib/tools/health-score";

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function gradeColor(score: number): { text: string; bg: string; border: string; bar: string } {
  if (score >= 75) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    bar: "bg-red-500",
  };
}

function ScoreCircle({ score, grade }: { score: number; grade: string }) {
  const colors = gradeColor(score);
  // SVG circle: radius=44, circumference ≈ 276.46
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" width="128" height="128">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={score >= 75 ? "#059669" : score >= 60 ? "#D97706" : "#DC2626"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div className="flex flex-col items-center leading-none">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
          <span className="mt-0.5 text-xs font-medium text-slate-400">/ 100</span>
        </div>
      </div>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold shadow-sm ${colors.text} ${colors.bg} border ${colors.border}`}
      >
        {grade}
      </div>
    </div>
  );
}

function CategoryBar({ category }: { category: CategoryScore }) {
  const colors = gradeColor(category.score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{category.name}</span>
        <span className={`text-sm font-bold ${colors.text}`}>{category.score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${category.score}%`,
            background: AI_GRADIENT,
          }}
        />
      </div>
      <p className="text-xs text-slate-500">{category.insight}</p>
    </div>
  );
}

function ResultsView({
  result,
  onReset,
}: {
  result: HealthScoreResult;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-6 py-4 text-white"
          style={{ background: AI_GRADIENT }}
        >
          <Activity className="h-5 w-5" />
          <p className="font-semibold">Document Health Score</p>
        </div>

        {/* Score + summary */}
        <div className="flex flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:items-start sm:gap-8">
          <ScoreCircle score={result.overallScore} grade={result.grade} />
          <div className="flex-1 text-center sm:text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Executive Summary
            </p>
            <p className="text-sm leading-relaxed text-slate-700">{result.summary}</p>
          </div>
        </div>

        {/* Category bars */}
        <div className="border-t border-slate-100 px-6 py-5 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Category Breakdown
          </p>
          {result.categories.map((cat) => (
            <CategoryBar key={cat.name} category={cat} />
          ))}
        </div>
      </div>

      {/* Strengths + Improvements */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Strengths */}
        {result.strengths.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Strengths
            </p>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {result.improvements.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
              Improvements
            </p>
            <ul className="space-y-2">
              {result.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset} className="gap-2">
          <FileText className="h-4 w-4" />
          Analyze another document
        </Button>
      </div>
    </div>
  );
}

export function HealthScoreTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<HealthScoreResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (f.type !== "application/pdf") return;
    setFile(f);
    setPhase("idle");
    setResult(null);
    setErrorMsg(null);
  };

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setPhase("uploading");
    setErrorMsg(null);

    try {
      // Step 1: get signed upload URL
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: "application/pdf",
          sizeBytes: file.size,
        }),
      });

      if (!uploadRes.ok) {
        const { error } = await uploadRes.json() as { error?: string };
        throw new Error(error ?? "Upload failed");
      }

      const { fileId, uploadUrl } = await uploadRes.json() as { fileId: string; uploadUrl: string };

      // Step 2: PUT file to storage
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!putRes.ok) throw new Error("Failed to upload file to storage");

      // Step 3: run health score analysis
      setPhase("analyzing");

      const analyzeRes = await fetch("/api/tools/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (!analyzeRes.ok) {
        const { error } = await analyzeRes.json() as { error?: string };
        throw new Error(error ?? "Analysis failed");
      }

      const { result: healthResult } = await analyzeRes.json() as { result: HealthScoreResult };
      setResult(healthResult);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  // Done
  if (phase === "done" && result) {
    return <ResultsView result={result} onReset={reset} />;
  }

  // Analyzing
  if (phase === "analyzing") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: AI_GRADIENT }}
        >
          <Activity className="h-7 w-7 animate-pulse" />
        </div>
        <p className="font-semibold text-slate-900">AI is auditing your document…</p>
        <p className="mt-1 text-sm text-slate-500">Checking readability, structure, language, and completeness.</p>
      </div>
    );
  }

  // Uploading
  if (phase === "uploading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-violet-600" />
        <p className="font-semibold text-slate-900">Uploading…</p>
      </div>
    );
  }

  // Idle / file selected
  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {!file && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) pickFile(f);
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "border-violet-400 bg-violet-50"
              : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: AI_GRADIENT }}
          >
            <Upload className="h-7 w-7" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-900">Drop your PDF here</p>
          <p className="mb-4 text-sm text-slate-500">or click to browse — max 10 MB</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
            PDF
          </span>
        </div>
      )}

      {/* File selected */}
      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="font-mono text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Change
            </button>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">5 credits will be used</p>
            <Button
              onClick={handleAnalyze}
              className="gap-2 text-white"
              style={{ background: AI_GRADIENT }}
            >
              <Activity className="h-4 w-4" />
              Analyze Document
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="mt-0.5 text-sm text-red-600">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
        }}
      />

      <p className="text-center text-xs text-slate-400">
        Files are encrypted in transit and automatically deleted after 1 hour.
      </p>
    </div>
  );
}
