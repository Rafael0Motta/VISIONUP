import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES } from "./parse";

export async function uploadTemplateMedia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  organizationId: string,
  mediaType: string,
  file: File | null
): Promise<{ path: string | null; error: string | null }> {
  if (!file || file.size === 0) {
    return { path: null, error: null };
  }
  if (mediaType !== "image" && mediaType !== "video") {
    return { path: null, error: null };
  }

  const limit = mediaType === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
  if (file.size > limit) {
    return { path: null, error: `Arquivo muito grande. Limite: ${Math.round(limit / 1024 / 1024)}MB.` };
  }
  if (!file.type.startsWith(`${mediaType}/`)) {
    return {
      path: null,
      error: `O arquivo enviado não parece ser um${mediaType === "image" ? "a imagem" : " vídeo"} válido.`,
    };
  }

  const safeFileName = file.name.replace(/[^\w.-]+/g, "_").slice(-100);
  const path = `${organizationId}/${Date.now()}-${safeFileName}`;
  const { error } = await supabase.storage
    .from("template-media")
    .upload(path, file, { contentType: file.type });

  if (error) {
    return { path: null, error: "Não foi possível enviar o arquivo de mídia." };
  }

  return { path, error: null };
}
