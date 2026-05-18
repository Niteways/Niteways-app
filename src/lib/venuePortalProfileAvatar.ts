import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload venue staff profile photo to public `avatars` bucket (same path convention as admin upload). */
export async function uploadVenuePortalProfileAvatarFile(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ url: string | null; error?: string }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Please select an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be less than 5MB." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safe = ["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext) ? ext : "jpg";
  const path = `profiles/${userId}-${Date.now()}.${safe}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${safe}`,
  });
  if (uploadError) return { url: null, error: uploadError.message };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
