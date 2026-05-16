import type { Metadata } from "next";
import { TEMPLATES } from "@/lib/templates/registry";
import { TemplateCatalog } from "./_components/template-catalog";

export const metadata: Metadata = {
  title: "Document Templates — UpdatePDF",
  description:
    "Professional PDF templates for business, HR, finance, and productivity. Fill and download in seconds.",
};

export default function TemplatesPage() {
  return <TemplateCatalog templates={TEMPLATES} />;
}
