"use client";

import { useMemo } from "react";
import type { BrainDocument } from "./brain-workspace";

interface Props {
  documents: BrainDocument[];
}

const SVG_W = 560;
const SVG_H = 360;
const CENTER_X = SVG_W / 2;
const CENTER_Y = SVG_H / 2;
const ORBIT_RADIUS = 130;
const HUB_R = 28;
const MIN_NODE_R = 10;
const MAX_NODE_R = 22;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function BrainGraph({ documents }: Props) {
  const readyDocs = documents.filter((d) => d.status === "ready");

  const nodes = useMemo(() => {
    if (readyDocs.length === 0) return [];
    const maxChunks = Math.max(...readyDocs.map((d) => d.chunk_count ?? 1), 1);
    return readyDocs.map((doc, i) => {
      const angle = (2 * Math.PI * i) / readyDocs.length - Math.PI / 2;
      const chunkRatio = (doc.chunk_count ?? 1) / maxChunks;
      const r = MIN_NODE_R + chunkRatio * (MAX_NODE_R - MIN_NODE_R);
      const x = CENTER_X + ORBIT_RADIUS * Math.cos(angle);
      const y = CENTER_Y + ORBIT_RADIUS * Math.sin(angle);
      return { doc, x, y, r, angle };
    });
  }, [readyDocs]);

  if (readyDocs.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
            <circle cx="12" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <circle cx="19" cy="19" r="2" />
            <line x1="12" y1="7" x2="5" y2="17" />
            <line x1="12" y1="7" x2="19" y2="17" />
          </svg>
        </div>
        <h3 className="mb-1 font-semibold text-slate-800">Knowledge Graph</h3>
        <p className="text-sm text-slate-500">
          Add at least 2 ready documents to see the knowledge graph
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Knowledge Graph</h3>
        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
          {readyDocs.length} documents
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ maxHeight: "360px" }}
        aria-label="Knowledge graph showing document connections"
      >
        <defs>
          <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </radialGradient>
          <radialGradient id="node-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </radialGradient>
        </defs>

        {/* Edges from hub to each doc node */}
        {nodes.map(({ doc, x, y }) => (
          <line
            key={`edge-${doc.id}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={x}
            y2={y}
            stroke="#CBD5E1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ))}

        {/* Central hub */}
        <circle cx={CENTER_X} cy={CENTER_Y} r={HUB_R} fill="url(#hub-grad)" />
        <text
          x={CENTER_X}
          y={CENTER_Y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight={700}
          fill="white"
          fontFamily="sans-serif"
        >
          BRAIN
        </text>

        {/* Document nodes */}
        {nodes.map(({ doc, x, y, r }) => (
          <g key={doc.id}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="url(#node-grad)"
              opacity={0.9}
            />
            <text
              x={x}
              y={y + r + 10}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
              fontFamily="sans-serif"
            >
              {truncate(doc.filename.replace(/\.pdf$/i, ""), 20)}
            </text>
            {doc.chunk_count > 0 && (
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fill="white"
                fontWeight={700}
                fontFamily="sans-serif"
              >
                {doc.chunk_count}
              </text>
            )}
          </g>
        ))}
      </svg>

      <p className="mt-2 text-center text-[10px] text-slate-400">
        Node size proportional to chunk count · {readyDocs.length} documents indexed
      </p>
    </div>
  );
}
