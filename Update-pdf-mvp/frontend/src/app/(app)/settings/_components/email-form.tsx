"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changeEmail } from "@/app/actions/settings";

interface EmailFormProps {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: EmailFormProps) {
  const [state, action, pending] = useActionState(changeEmail, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Current email</label>
        <input
          type="email"
          value={currentEmail}
          disabled
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="new_email" className="block text-sm font-medium text-slate-700">
          New email
        </label>
        <input
          id="new_email"
          name="new_email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="new@example.com"
        />
        <p className="text-xs text-slate-400">
          A verification link will be sent to both addresses.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">{state.message}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {pending ? "Sending…" : "Change email"}
      </Button>
    </form>
  );
}
