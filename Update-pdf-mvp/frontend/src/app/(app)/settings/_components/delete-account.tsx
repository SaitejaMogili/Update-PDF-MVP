"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions/settings";

export function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteAccount, null);
  const [confirmation, setConfirmation] = useState("");

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        This will permanently delete your account, all your files, and cancel any active
        subscription. <strong>This cannot be undone.</strong>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmation" className="block text-sm font-medium text-slate-700">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
          placeholder="DELETE"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={confirmation !== "DELETE" || pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Deleting account…" : "Delete my account"}
      </button>
    </form>
  );
}
