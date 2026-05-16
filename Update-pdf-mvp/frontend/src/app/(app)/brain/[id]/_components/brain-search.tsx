"use client";

import { useState } from "react";
import { Search, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrainChunk } from "@/lib/brain";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";

interface Props {
  workspaceId: string;
  hasDocuments: boolean;
}

export function BrainSearch({ workspaceId, hasDocuments }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrainChunk[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setErrorMsg(null);
    setSearched(false);

    try {
      const res = await fetch(
        `/api/brain/workspaces/${workspaceId}/search?q=${encodeURIComponent(query.trim())}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setResults(json.results ?? []);
      setSearched(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  if (!hasDocuments) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: BRAIN_GRADIENT }}
        >
          <Search className="h-6 w-6" />
        </div>
        <h3 className="mb-2 font-semibold text-slate-800">No documents to search</h3>
        <p className="text-sm text-slate-500">
          Add PDF documents in the <strong>Documents</strong> tab to enable cross-document search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search across all documents…"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="gap-2 text-white disabled:opacity-50"
          style={{ background: BRAIN_GRADIENT }}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{errorMsg}</p>
      )}

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
          {results.map((result, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                  style={{ background: BRAIN_GRADIENT }}
                >
                  <FileText className="h-3 w-3" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{result.filename}</span>
                <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                  p.{result.pageNumber}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 font-mono">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{result.content}</p>
            </div>
          ))}
        </div>
      )}

      {!searched && !searching && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Enter a search query to find relevant passages across your documents</p>
        </div>
      )}
    </div>
  );
}
