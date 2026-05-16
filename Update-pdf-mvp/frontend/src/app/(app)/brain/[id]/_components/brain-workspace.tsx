"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowLeft, MessageSquare, FileText, Search, GitBranch, HeartPulse } from "lucide-react";
import { BrainChat } from "./brain-chat";
import { BrainDocuments } from "./brain-documents";
import { BrainSearch } from "./brain-search";
import { BrainGraph } from "./brain-graph";
import { BrainHealth } from "./brain-health";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";

export interface BrainDocument {
  id: string;
  filename: string;
  page_count: number | null;
  chunk_count: number;
  status: "pending" | "ingesting" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
  file_id: string | null;
}

export interface BrainAgent {
  id: string;
  name: string;
  system_prompt: string;
  is_system: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  file_ids: string[];
  created_at: string;
  updated_at: string;
}

interface Props {
  workspace: Workspace;
  documents: BrainDocument[];
  agents: BrainAgent[];
}

type Tab = "chat" | "documents" | "search" | "graph" | "health";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "search", label: "Search", icon: Search },
  { id: "graph", label: "Graph", icon: GitBranch },
  { id: "health", label: "Health", icon: HeartPulse },
];

export function BrainWorkspace({ workspace: initialWorkspace, documents: initialDocs, agents }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [documents, setDocuments] = useState<BrainDocument[]>(initialDocs);
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);

  const handleDocumentsChange = (newDocs: BrainDocument[]) => {
    setDocuments(newDocs);
    // Update workspace file_ids optimistically
    const readyFileIds = newDocs
      .filter((d) => d.status === "ready" && d.file_id)
      .map((d) => d.file_id as string);
    setWorkspace((prev) => ({ ...prev, file_ids: readyFileIds }));
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/brain")}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: BRAIN_GRADIENT }}
        >
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-xs text-slate-500">{workspace.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "chat" && (
          <BrainChat
            workspaceId={workspace.id}
            agents={agents}
            hasDocuments={documents.some((d) => d.status === "ready")}
          />
        )}
        {activeTab === "documents" && (
          <BrainDocuments
            workspaceId={workspace.id}
            documents={documents}
            onDocumentsChange={handleDocumentsChange}
          />
        )}
        {activeTab === "search" && (
          <BrainSearch
            workspaceId={workspace.id}
            hasDocuments={documents.some((d) => d.status === "ready")}
          />
        )}
        {activeTab === "graph" && (
          <BrainGraph documents={documents} />
        )}
        {activeTab === "health" && (
          <BrainHealth documents={documents} workspace={workspace} />
        )}
      </div>
    </div>
  );
}
