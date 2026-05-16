"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/app/actions/settings";

interface ProfileFormProps {
  fullName: string | null;
  email: string;
}

export function ProfileForm({ fullName, email }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={fullName ?? ""}
          maxLength={100}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          placeholder="Your name"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400">Email cannot be changed here.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600">Profile updated.</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
