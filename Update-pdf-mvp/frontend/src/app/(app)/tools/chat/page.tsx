import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { ChatTool } from "./_components/chat-tool";

export const metadata: Metadata = {
  title: "Chat with PDF — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

export default function ChatPage() {
  return (
    <ToolPageShell
      name="Chat with PDF"
      description="Ask questions and get answers grounded in your document. Powered by AI."
      icon={MessageSquareText}
      gradient={AI_GRADIENT}
      creditCost={5}
    >
      <ChatTool />
    </ToolPageShell>
  );
}
