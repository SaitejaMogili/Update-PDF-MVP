"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ActionState = { error?: string; success?: boolean; message?: string } | null;

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  if (fullName.length > 100) return { error: "Name must be 100 characters or fewer" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: "Failed to update profile" };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!currentPassword || !newPassword || !confirmPassword)
    return { error: "All fields are required" };
  if (newPassword.length < 8)
    return { error: "New password must be at least 8 characters" };
  if (newPassword !== confirmPassword)
    return { error: "New passwords don't match" };
  if (newPassword === currentPassword)
    return { error: "New password must be different from current password" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: "Current password is incorrect" };

  // Update to new password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "Failed to update password" };

  return { success: true };
}

export async function changeEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const newEmail = (formData.get("new_email") as string)?.trim().toLowerCase();

  if (!newEmail || !newEmail.includes("@"))
    return { error: "Enter a valid email address" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (newEmail === user.email) return { error: "That is already your current email" };

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { error: "Failed to update email" };

  return {
    success: true,
    message: `Verification email sent to ${newEmail}. Click the link to confirm the change.`,
  };
}

export async function deleteAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const confirmation = formData.get("confirmation") as string;
  if (confirmation !== "DELETE") return { error: 'Type DELETE in capitals to confirm' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return { error: "Failed to delete account. Please try again." };

  await supabase.auth.signOut();
  redirect("/login");
}
