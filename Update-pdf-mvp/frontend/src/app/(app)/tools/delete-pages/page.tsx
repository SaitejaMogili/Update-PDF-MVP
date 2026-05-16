import type { Metadata } from "next";
import { FileX } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { DeletePagesTool } from "./_components/delete-pages-tool";

export const metadata: Metadata = {
  title: "Delete PDF Pages — UpdatePDF",
};

export default function DeletePagesPage() {
  return (
    <ToolPageShell
      name="Delete Pages"
      description="Remove unwanted pages from a PDF. Everything else stays in place."
      icon={FileX}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <DeletePagesTool />
    </ToolPageShell>
  );
}
