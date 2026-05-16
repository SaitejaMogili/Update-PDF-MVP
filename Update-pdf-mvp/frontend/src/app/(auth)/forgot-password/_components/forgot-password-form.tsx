"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
          <p className="mt-1 text-sm text-slate-500">
            If that address is registered, we&apos;ve sent a password reset link. It expires in 1 hour.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="text-sm text-slate-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="you@example.com"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
      >
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
