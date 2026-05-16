"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/app/actions/settings";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="current_password" className="block text-sm font-medium text-slate-700">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">Password updated successfully.</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
