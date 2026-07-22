"use client";

import { useActionState, useMemo, useState } from "react";
import { createVariation, updateVariation, type VariationFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import {
  BUTTON_TYPES,
  BUTTON_TYPE_LABELS,
  MAX_BUTTONS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  type TemplateButton,
} from "@/lib/templates/parse";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: VariationFormState = { error: null };

const MEDIA_TYPE_OPTIONS: { value: "none" | "image" | "video"; label: string }[] = [
  { value: "none", label: "Sem mídia" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
];

const MEDIA_SIZE_LIMITS: Record<string, number> = {
  image: MAX_IMAGE_SIZE_BYTES,
  video: MAX_VIDEO_SIZE_BYTES,
};

function formatMb(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

type ButtonSlot = { type: TemplateButton["type"]; label: string; value: string };

function slotsFromButtons(buttons: TemplateButton[]): ButtonSlot[] {
  return buttons
    .slice(0, MAX_BUTTONS)
    .map((btn) => ({ type: btn.type, label: btn.label, value: btn.value ?? "" }));
}

export type VariationInitialValues = {
  content: string;
  media_type: "none" | "image" | "video" | "text";
  mediaUrl: string | null;
  footer_text: string | null;
  buttons: TemplateButton[];
};

export function VariationForm({
  mode,
  variationId,
  initialValues,
}: {
  mode: "create" | "edit";
  variationId?: string;
  initialValues?: VariationInitialValues;
}) {
  const resolvedAction =
    mode === "create" ? createVariation : updateVariation.bind(null, variationId!);
  const [state, formAction, isPending] = useActionState(resolvedAction, initialState);
  useActionToast(state, isPending, mode === "edit" ? "Variação atualizada." : null);

  const [content, setContent] = useState(initialValues?.content ?? "");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">(
    initialValues?.media_type === "image" || initialValues?.media_type === "video"
      ? initialValues.media_type
      : "none"
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [footerTextState, setFooterTextState] = useState(initialValues?.footer_text ?? "");
  const [slots, setSlots] = useState<ButtonSlot[]>(slotsFromButtons(initialValues?.buttons ?? []));

  const previewMediaUrl = useMemo(() => {
    if (mediaFile) return URL.createObjectURL(mediaFile);
    return initialValues?.mediaUrl ?? undefined;
  }, [mediaFile, initialValues?.mediaUrl]);

  function handleMediaFileChange(file: File | null) {
    setMediaError(null);
    if (!file) {
      setMediaFile(null);
      return;
    }
    const limit = MEDIA_SIZE_LIMITS[mediaType];
    if (limit && file.size > limit) {
      setMediaError(`Arquivo muito grande. Limite: ${formatMb(limit)}.`);
      setMediaFile(null);
      return;
    }
    setMediaFile(file);
  }

  function addSlot() {
    setSlots((prev) =>
      prev.length < MAX_BUTTONS ? [...prev, { type: "quick_reply", label: "", value: "" }] : prev
    );
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, patch: Partial<ButtonSlot>) {
    setSlots((prev) => prev.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));
  }

  const previewButtons: TemplateButton[] = slots
    .filter((s) => s.label)
    .map((s) => ({ type: s.type, label: s.label, value: s.value }));

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="content">Texto</Label>
          <Textarea
            id="content"
            name="content"
            rows={4}
            maxLength={1024}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Opa {{1}}!\n\nTemos novidade: {{2}}.\n\n{{3}}\n\nPara {{4}}, use o botão abaixo 👇"}
            required
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{1}}"}, {"{{2}}"}... para variáveis. {content.length}/1024
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="media_type">Mídia (opcional)</Label>
          <Select
            name="media_type"
            value={mediaType}
            onValueChange={(value) => {
              setMediaType(value as typeof mediaType);
              setMediaFile(null);
              setMediaError(null);
            }}
          >
            <SelectTrigger id="media_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mediaType === "image" || mediaType === "video" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="media_file">
              Arquivo de {mediaType === "image" ? "imagem" : "vídeo"} (até{" "}
              {formatMb(MEDIA_SIZE_LIMITS[mediaType])})
            </Label>
            <Input
              id="media_file"
              name="media_file"
              type="file"
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={(e) => handleMediaFileChange(e.target.files?.[0] ?? null)}
              disabled={isPending}
            />
            {mediaError ? <p className="text-xs text-destructive">{mediaError}</p> : null}
            {!mediaFile && initialValues?.mediaUrl ? (
              <p className="text-xs text-muted-foreground">
                Já existe um arquivo salvo. Envie um novo pra substituir.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="footer_text">Rodapé padrão (opcional)</Label>
          <Input
            id="footer_text"
            name="footer_text"
            placeholder={'Ex: Digite "sair" para não receber mais.'}
            value={footerTextState}
            onChange={(e) => setFooterTextState(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Botões padrão (até {MAX_BUTTONS})</p>
            {slots.length < MAX_BUTTONS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                disabled={isPending}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="size-3.5" />
                Adicionar botão
              </Button>
            ) : null}
          </div>

          {slots.map((slot, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Select
                name={`button_${i + 1}_type`}
                value={slot.type}
                onValueChange={(value) => updateSlot(i, { type: value as TemplateButton["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {BUTTON_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name={`button_${i + 1}_label`}
                placeholder="Texto do botão"
                value={slot.label}
                onChange={(e) => updateSlot(i, { label: e.target.value })}
                disabled={isPending}
              />
              <Input
                name={`button_${i + 1}_value`}
                placeholder={slot.type === "url" ? "URL" : slot.type === "phone_number" ? "Telefone" : "—"}
                value={slot.value}
                onChange={(e) => updateSlot(i, { value: e.target.value })}
                disabled={isPending || slot.type === "quick_reply"}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSlot(i)}
                disabled={isPending}
                className="size-8"
                aria-label="Remover botão"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum botão adicionado.</p>
          ) : null}
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending || !!mediaError} className="w-fit">
          {isPending ? "Salvando..." : mode === "create" ? "Adicionar variação" : "Salvar alterações"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <WhatsAppPreview
          mediaType={mediaType}
          mediaUrl={previewMediaUrl}
          bodyText={content}
          footerText={footerTextState}
          buttons={previewButtons}
        />
      </div>
    </form>
  );
}
