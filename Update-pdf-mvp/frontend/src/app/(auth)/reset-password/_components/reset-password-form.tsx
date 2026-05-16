"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, null);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
        <p className="text-sm text-slate-500">Choose a strong password for your account.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="Min. 8 characters"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
      >
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
