"use client";

import { useRef, useState, useEffect } from "react";
import {
  Users,
  PenLine,
  Mic2,
  GraduationCap,
  BarChart2,
  Mail,
  ListChecks,
  FileText,
  Mic,
  Upload,
  CheckCircle,
  ArrowLeft,
  Download,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOC_TYPES, type DocTypeKey } from "@/lib/tools/voice-to-doc-shared";

type Phase = "type-select" | "record" | "uploading" | "done" | "error";

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  PenLine,
  Mic2,
  GraduationCap,
  BarChart2,
  Mail,
  ListChecks,
  FileText,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VoiceToDocTool() {
  const [phase, setPhase] = useState<Phase>("type-select");
  const [selectedType, setSelectedType] = useState<DocTypeKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setAudioBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadedFile(f);
      setAudioBlob(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    const audioSource = audioBlob ?? uploadedFile;
    if (!audioSource) return;

    setPhase("uploading");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      } else if (uploadedFile) {
        formData.append("audio", uploadedFile, uploadedFile.name);
      }
      formData.append("docType", selectedType);

      const res = await fetch("/api/tools/voice-to-doc", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Processing failed");
      }

      const { downloadUrl: url, filename } = await res.json();
      setDownloadUrl(url);
      setDownloadFilename(filename);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("type-select");
    setSelectedType(null);
    setErrorMsg(null);
    setDownloadUrl(null);
    setDownloadFilename(null);
    setAudioBlob(null);
    setUploadedFile(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Phase: type-select ──────────────────────────────────────────
  if (phase === "type-select") {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Choose document type</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select the kind of document you want to generate from your recording.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(DOC_TYPES) as [DocTypeKey, (typeof DOC_TYPES)[DocTypeKey]][]).map(
            ([key, config]) => {
              const Icon = ICON_MAP[config.icon] ?? FileText;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedType(key);
                    setPhase("record");
                  }}
                  className="group flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-violet-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
                    style={{ background: AI_GRADIENT }}
                  >
                    <Icon className="h-4.5 w-4.5 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                      {config.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>
    );
  }

  // ── Phase: uploading / processing ──────────────────────────────
  if (phase === "uploading") {
    const label = selectedType ? DOC_TYPES[selectedType].label : "document";
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: AI_GRADIENT }}
        >
          <Mic className="h-7 w-7 animate-pulse" />
        </div>
        <p className="font-semibold text-slate-900">Transcribing and formatting your document…</p>
        <p className="mt-1 text-sm text-slate-500">
          Generating a {label}. This may take 15–30 seconds.
        </p>
      </div>
    );
  }

  // ── Phase: done ─────────────────────────────────────────────────
  if (phase === "done") {
    const label = selectedType ? DOC_TYPES[selectedType].label : "Document";
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ background: AI_GRADIENT }}
            >
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Your document is ready</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 px-6 py-8">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: AI_GRADIENT }}
            >
              <FileText className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">{downloadFilename}</p>
              <p className="mt-0.5 text-xs text-slate-500">PDF document</p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={downloadFilename ?? "voice-document.pdf"}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: AI_GRADIENT }}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase: error ────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  // ── Phase: record ───────────────────────────────────────────────
  const hasAudio = !!(audioBlob ?? uploadedFile);
  const audioSize = audioBlob?.size ?? uploadedFile?.size ?? 0;
  const audioName = uploadedFile?.name ?? (audioBlob ? `Recording (${formatSeconds(recordingSeconds)})` : null);

  return (
    <div className="space-y-5">
      {/* Back button + selected type */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setPhase("type-select");
            setAudioBlob(null);
            setUploadedFile(null);
            setIsRecording(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        {selectedType && (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {DOC_TYPES[selectedType].label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Record panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: AI_GRADIENT }}
            >
              <Mic className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Record audio</p>
          </div>

          {!isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              className="w-full gap-2 text-white"
              style={{ background: AI_GRADIENT }}
            >
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {formatSeconds(recordingSeconds)}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={stopRecording}
                className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                Stop Recording
              </Button>
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900">
                    Recording ready ({formatSeconds(recordingSeconds)})
                  </p>
                  <p className="text-[11px] text-slate-400">{formatBytes(audioBlob.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setRecordingSeconds(0);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Re-record
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Records from your browser microphone. Max 25 MB.
          </p>
        </div>

        {/* Upload panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: AI_GRADIENT }}
            >
              <Upload className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Upload audio file</p>
          </div>

          {!uploadedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center transition-all hover:border-violet-300 hover:bg-violet-50"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">
                Click to browse
              </span>
              <span className="text-[11px] text-slate-400">
                MP3, M4A, WAV, WebM, OGG — max 25 MB
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-900">{uploadedFile.name}</p>
                  <p className="text-[11px] text-slate-400">{formatBytes(uploadedFile.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-[11px] text-slate-400">
            Supports MP3, M4A, WAV, WebM, and OGG formats.
          </p>
        </div>
      </div>

      {/* Transcribe button */}
      {hasAudio && (
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleSubmit}
            className="gap-2 px-8 text-white shadow-md"
            style={{ background: AI_GRADIENT }}
            size="lg"
          >
            <Mic className="h-4 w-4" />
            Transcribe &amp; Generate PDF
          </Button>
          <p className="text-xs text-slate-400">
            Uses 10 credits ·{" "}
            {audioName && <span className="font-medium text-slate-500">{audioName}</span>}
            {audioSize > 0 && <span> ({formatBytes(audioSize)})</span>}
          </p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Audio is processed securely and never stored beyond your session.
      </p>
    </div>
  );
}
