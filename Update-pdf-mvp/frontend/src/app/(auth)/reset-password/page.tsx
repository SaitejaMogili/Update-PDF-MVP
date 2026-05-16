import type { Metadata } from "next";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password — UpdatePDF",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
