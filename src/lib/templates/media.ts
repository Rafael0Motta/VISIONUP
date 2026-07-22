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

/**
 * Mídia do catálogo de variações (`message_variations`) é global — sem
 * organização — então fica num bucket próprio (`catalog-media`), separado
 * do `template-media` (que é sempre escopado por pasta de organização).
 */
export async function uploadCatalogMedia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
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
  const path = `${Date.now()}-${safeFileName}`;
  const { error } = await supabase.storage
    .from("catalog-media")
    .upload(path, file, { contentType: file.type });

  if (error) {
    return { path: null, error: "Não foi possível enviar o arquivo de mídia." };
  }

  return { path, error: null };
}

/**
 * Primeira vez que uma campanha usa uma variação do catálogo que já tem
 * mídia padrão: copia o arquivo do bucket global `catalog-media` pra dentro
 * do `template-media/{organizationId}/...` da campanha. Assim toda a leitura
 * de mídia de campanha que já existe (aprovações, resumo, revisão da etapa
 * mensagem) continua funcionando sem mudança — mídia de campanha sempre mora
 * em `template-media`, só a origem do primeiro upload que muda. Retorna
 * `null` em qualquer falha (não é fatal: a campanha só fica sem mídia).
 */
export async function copyCatalogMediaToCampaign(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  organizationId: string,
  campaignId: string,
  catalogMediaPath: string
): Promise<string | null> {
  const { data: file, error: downloadError } = await supabase.storage
    .from("catalog-media")
    .download(catalogMediaPath);
  if (downloadError || !file) return null;

  const fileName = catalogMediaPath.split("/").pop() ?? "midia";
  const newPath = `${organizationId}/${campaignId}/catalogo-${Date.now()}-${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("template-media")
    .upload(newPath, file, { contentType: file.type });
  if (uploadError) return null;

  return newPath;
}
