"use client";

import { useActionState, useMemo, useState } from "react";
import { createTemplate, updateTemplate, type TemplateFormState } from "./actions";
import { useActionToast } from "@/lib/use-action-toast";
import {
  extractVariableIndexes,
  BUTTON_TYPES,
  BUTTON_TYPE_LABELS,
  MAX_BUTTONS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  type TemplateButton,
  type TemplateVariable,
} from "@/lib/templates/parse";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Shuffle, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: TemplateFormState = { error: null };

const MEDIA_TYPE_OPTIONS: { value: "none" | "image" | "video"; label: string }[] = [
  { value: "none", label: "Texto" },
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

function pickRandom(pool: string[], exclude?: string): string {
  const options = pool.length > 1 ? pool.filter((p) => p !== exclude) : pool;
  return options[Math.floor(Math.random() * options.length)] ?? pool[0] ?? "";
}

export type TemplateFormInitialValues = {
  name: string;
  media_type: string;
  body_text: string;
  footer_text: string | null;
  variables: TemplateVariable[];
  buttons: TemplateButton[];
  use_variations: boolean;
  is_default: boolean;
};

export function TemplateForm({
  mode,
  templateId,
  actorRole,
  initialValues,
  activeVariationsCount,
  variationPool,
  action,
  submitLabel,
  defaultFooterText,
  hideUseVariations,
  existingMediaUrl,
}: {
  mode: "create" | "edit";
  templateId?: string;
  actorRole: "admin" | "cliente";
  initialValues?: TemplateFormInitialValues;
  activeVariationsCount: number;
  /** Catálogo de textos do "Variar Texto" — usado pra pré-preencher aleatoriamente na criação. */
  variationPool?: string[];
  /** Server action já vinculada (bind) pelo chamador. Default: createTemplate/updateTemplate. */
  action?: (prevState: TemplateFormState, formData: FormData) => Promise<TemplateFormState>;
  submitLabel?: string;
  /** Pré-preenche o rodapé na criação — continua editável. */
  defaultFooterText?: string;
  /** Esconde o toggle "Variar texto" (catálogo de rotação por envio). */
  hideUseVariations?: boolean;
  /** URL assinada da mídia já salva (modo edição). */
  existingMediaUrl?: string | null;
}) {
  const resolvedAction =
    action ?? (mode === "create" ? createTemplate : updateTemplate.bind(null, templateId!));
  const [state, formAction, isPending] = useActionState(resolvedAction, initialState);
  useActionToast(state, isPending, mode === "edit" ? "Template atualizado." : null);

  const [bodyText, setBodyText] = useState(() => {
    if (initialValues?.body_text) return initialValues.body_text;
    if (variationPool && variationPool.length > 0) return pickRandom(variationPool);
    return "";
  });
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">(
    initialValues?.media_type === "image" || initialValues?.media_type === "video"
      ? initialValues.media_type
      : "none"
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [footerTextState, setFooterTextState] = useState(
    initialValues?.footer_text ?? defaultFooterText ?? ""
  );
  const [slots, setSlots] = useState<ButtonSlot[]>(
    slotsFromButtons(initialValues?.buttons ?? [])
  );
  const [variableExamples, setVariableExamples] = useState<Record<number, string>>(
    Object.fromEntries((initialValues?.variables ?? []).map((v) => [v.index, v.example]))
  );

  const variableIndexes = extractVariableIndexes(bodyText);

  const previewMediaUrl = useMemo(() => {
    if (mediaFile) return URL.createObjectURL(mediaFile);
    return existingMediaUrl ?? undefined;
  }, [mediaFile, existingMediaUrl]);

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

  function handleShuffleTemplate() {
    if (!variationPool || variationPool.length === 0) return;
    setBodyText((current) => pickRandom(variationPool, current));
  }

  const previewButtons: TemplateButton[] = slots
    .filter((s) => s.label)
    .map((s) => ({ type: s.type, label: s.label, value: s.value }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form action={formAction} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do template</Label>
            <Input
              id="name"
              name="name"
              placeholder="ex: promo_black_friday"
              defaultValue={initialValues?.name}
              required
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="media_type">Mídia</Label>
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
            {!mediaFile && existingMediaUrl ? (
              <p className="text-xs text-muted-foreground">
                Já existe um arquivo salvo. Envie um novo pra substituir.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body_text">Texto</Label>
            {variationPool && variationPool.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleShuffleTemplate}
                disabled={isPending}
                className="h-7 gap-1 text-xs text-muted-foreground"
              >
                <Shuffle className="size-3.5" />
                Variar template
              </Button>
            ) : null}
          </div>
          <Textarea
            id="body_text"
            name="body_text"
            rows={6}
            maxLength={1024}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={"Opa {{1}}! Temos novidade: {{2}}."}
            required
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{1}}"}, {"{{2}}"}... para variáveis. {bodyText.length}/1024
          </p>
        </div>

        {variableIndexes.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            <p className="text-sm font-medium">
              Exemplos das variáveis <span className="font-normal text-destructive">(obrigatório)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Toda variável usada no texto precisa de um exemplo preenchido — sem isso a campanha não
              pode ser enviada para aprovação.
            </p>
            {variableIndexes.map((index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-12 shrink-0 rounded bg-muted px-2 py-1 text-center font-mono text-xs">
                  {`{{${index}}}`}
                </span>
                <Input
                  name={`variable_example_${index}`}
                  placeholder="Valor de exemplo"
                  value={variableExamples[index] ?? ""}
                  onChange={(e) =>
                    setVariableExamples((prev) => ({ ...prev, [index]: e.target.value }))
                  }
                  required
                  disabled={isPending}
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="footer_text">Rodapé (opcional)</Label>
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
            <p className="text-sm font-medium">Botões de ação (até {MAX_BUTTONS})</p>
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
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum botão adicionado.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          {!hideUseVariations ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="use_variations"
                name="use_variations"
                defaultChecked={initialValues?.use_variations}
                disabled={isPending}
              />
              <Label htmlFor="use_variations" className="font-normal">
                Variar texto ({activeVariationsCount} variações disponíveis no catálogo)
              </Label>
            </div>
          ) : null}

          {actorRole === "admin" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_default"
                name="is_default"
                defaultChecked={initialValues?.is_default}
                disabled={isPending}
              />
              <Label htmlFor="is_default" className="font-normal">
                Marcar como template padrão da organização
              </Label>
            </div>
          ) : null}
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" disabled={isPending || !!mediaError} className="w-fit">
          {isPending
            ? "Salvando..."
            : submitLabel ?? (mode === "create" ? "Criar template" : "Salvar alterações")}
        </Button>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <WhatsAppPreview
          mediaType={mediaType}
          mediaUrl={previewMediaUrl}
          bodyText={bodyText}
          footerText={footerTextState}
          buttons={previewButtons}
          variableValues={variableExamples}
        />
      </div>
    </div>
  );
}
