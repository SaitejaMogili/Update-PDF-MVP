import type { Metadata } from "next";
import { Mic } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { VoiceToDocTool } from "./_components/voice-to-doc-tool";

export const metadata: Metadata = {
  title: "Voice → Document — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

export default function VoiceToDocPage() {
  return (
    <ToolPageShell
      name="Voice → Document"
      description="Speak freely — AI transcribes, structures, and exports as a PDF document."
      icon={Mic}
      gradient={AI_GRADIENT}
      creditCost={10}
    >
      <VoiceToDocTool />
    </ToolPageShell>
  );
}
