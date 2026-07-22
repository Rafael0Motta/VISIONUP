"use client";

import { useActionState, useMemo, useState } from "react";
import { saveTemplateForCampaign, type TemplateFormState } from "../../actions";
import { useActionToast } from "@/lib/use-action-toast";
import {
  extractVariableIndexes,
  pickRandom,
  BUTTON_TYPES,
  BUTTON_TYPE_LABELS,
  MAX_BUTTONS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  VARIABLE_PLACEHOLDER_HINTS,
  type TemplateButton,
  type TemplateVariable,
} from "@/lib/templates/parse";
import { WhatsAppPreview } from "@/components/whatsapp-preview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shuffle, Plus, X, Pencil, TriangleAlert } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: TemplateFormState = { error: null };

const MEDIA_TYPE_OPTIONS: {
  value: "none" | "image" | "video";
  label: string;
}[] = [
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

type ButtonSlot = {
  type: TemplateButton["type"];
  label: string;
  value: string;
};

function slotsFromButtons(buttons: TemplateButton[]): ButtonSlot[] {
  return buttons.slice(0, MAX_BUTTONS).map((btn) => ({
    type: btn.type,
    label: btn.label,
    value: btn.value ?? "",
  }));
}

function HighlightedBody({ bodyText }: { bodyText: string }) {
  const parts = bodyText.split(/(\{\{\d+\}\})/g);
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed">
      {parts.map((part, i) =>
        /^\{\{\d+\}\}$/.test(part) ? (
          <span
            key={i}
            className="mx-0.5 inline-block rounded bg-primary/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export type CatalogVariation = {
  id: string;
  content: string;
  media_type: "none" | "image" | "video" | "text";
  mediaUrl: string | null;
  footer_text: string | null;
  buttons: TemplateButton[];
};

export type CatalogTemplateInitial = {
  body_text: string;
  media_type: "none" | "image" | "video" | "text";
  mediaUrl: string | null;
  footer_text: string | null;
  buttons: TemplateButton[];
  variables: TemplateVariable[];
  text_overridden: boolean;
};

export function CatalogTemplateForm({
  campaignId,
  existingTemplateId,
  variationPool,
  initial,
  defaultFooterText,
  allowTextOverride = false,
}: {
  campaignId: string;
  existingTemplateId: string | null;
  variationPool: CatalogVariation[];
  initial: CatalogTemplateInitial | null;
  defaultFooterText?: string;
  allowTextOverride?: boolean;
}) {
  const resolvedAction = saveTemplateForCampaign.bind(
    null,
    campaignId,
    existingTemplateId,
  );
  const [state, formAction, isPending] = useActionState(
    resolvedAction,
    initialState,
  );
  useActionToast(state, isPending, null);

  const [selected, setSelected] = useState<CatalogVariation | null>(() => {
    if (initial) return null;
    if (variationPool.length === 0) return null;
    const content = pickRandom(variationPool.map((v) => v.content));
    return variationPool.find((v) => v.content === content) ?? variationPool[0];
  });
  const currentBodyText = selected?.content ?? initial?.body_text ?? "";

  const [isEditingText, setIsEditingText] = useState(
    initial?.text_overridden ?? false,
  );
  const [customBodyText, setCustomBodyText] = useState(
    initial?.text_overridden ? initial.body_text : "",
  );
  const effectiveBodyText = isEditingText ? customBodyText : currentBodyText;

  function toggleTextEdit() {
    if (!isEditingText) {
      setCustomBodyText(currentBodyText);
    }
    setIsEditingText((v) => !v);
  }

  // Sem linha já salva pra campanha (`initial`), os campos nascem
  // pré-preenchidos com o padrão da variação escolhida — o usuário ainda
  // pode trocar tudo antes de salvar.
  function mediaTypeFrom(
    source:
      | { media_type: "none" | "image" | "video" | "text" }
      | null
      | undefined,
  ) {
    return source?.media_type === "image" || source?.media_type === "video"
      ? source.media_type
      : "none";
  }

  const [mediaType, setMediaType] = useState<"none" | "image" | "video">(
    initial ? mediaTypeFrom(initial) : mediaTypeFrom(selected),
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [footerTextState, setFooterTextState] = useState(
    initial?.footer_text ?? selected?.footer_text ?? defaultFooterText ?? "",
  );
  const [slots, setSlots] = useState<ButtonSlot[]>(
    slotsFromButtons(initial?.buttons ?? selected?.buttons ?? []),
  );
  const [variableExamples, setVariableExamples] = useState<
    Record<number, string>
  >(() =>
    Object.fromEntries(
      (initial?.variables ?? []).map((v) => [v.index, v.example]),
    ),
  );

  const variableIndexes = extractVariableIndexes(effectiveBodyText);

  const previewMediaUrl = useMemo(() => {
    if (mediaFile) return URL.createObjectURL(mediaFile);
    return initial?.mediaUrl ?? selected?.mediaUrl ?? undefined;
  }, [mediaFile, initial?.mediaUrl, selected?.mediaUrl]);

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

  function handleShuffle() {
    if (variationPool.length === 0) return;
    const content = pickRandom(
      variationPool.map((v) => v.content),
      currentBodyText,
    );
    const next =
      variationPool.find((v) => v.content === content) ?? variationPool[0];
    setSelected(next);
    setVariableExamples({});
    // Variar troca a "identidade" inteira do template, não só o texto — o
    // usuário ainda pode ajustar qualquer um desses campos depois.
    setMediaFile(null);
    setMediaError(null);
    setMediaType(mediaTypeFrom(next));
    setFooterTextState(next.footer_text ?? defaultFooterText ?? "");
    setSlots(slotsFromButtons(next.buttons));
  }

  function addSlot() {
    setSlots((prev) =>
      prev.length < MAX_BUTTONS
        ? [...prev, { type: "quick_reply", label: "", value: "" }]
        : prev,
    );
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, patch: Partial<ButtonSlot>) {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)),
    );
  }

  const previewButtons: TemplateButton[] = slots
    .filter((s) => s.label)
    .map((s) => ({ type: s.type, label: s.label, value: s.value }));

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {selected ? (
        <input type="hidden" name="variation_id" value={selected.id} />
      ) : null}

      <div className="flex flex-col gap-5">
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col gap-2 py-4 text-sm">
            <p className="font-medium">Como preencher</p>
            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                O texto abaixo é um dos modelos aprovados do nosso catálogo.
                Você pode utilizá-lo como está, gerar uma nova versão clicando
                em &quot;Variar template&quot; ou personalizá-lo livremente em
                &quot;Editar texto&quot;.
              </li>
              <li>
                Preencha cada campo destacado com a informação real da sua
                campanha.
              </li>
              <li>Se quiser, anexe uma imagem ou vídeo pra essa campanha.</li>
              <li>Acompanhe a prévia da mensagem completa ao lado.</li>
              <li>Clique em &quot;Avançar&quot; quando terminar.</li>
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>
              {isEditingText ? "Texto da mensagem" : "Texto do template (fixo)"}
            </Label>
            <div className="flex items-center gap-1">
              {!isEditingText && variationPool.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShuffle}
                  disabled={isPending}
                  className="h-7 gap-1 text-xs text-muted-foreground"
                >
                  <Shuffle className="size-3.5" />
                  Variar template
                </Button>
              ) : null}
              {allowTextOverride ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleTextEdit}
                  disabled={isPending}
                  className="h-7 gap-1 text-xs text-muted-foreground"
                >
                  <Pencil className="size-3.5" />
                  {isEditingText ? "Usar texto do catálogo" : "Editar texto"}
                </Button>
              ) : null}
            </div>
          </div>

          {isEditingText ? (
            <>
              <Card className="border-warning/30 bg-warning/10">
                <CardContent className="flex items-start gap-2 py-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Texto fora do padrão do catálogo —{" "}
                    <strong className="text-foreground">
                      pode não ser aprovado
                    </strong>{" "}
                    e pode ser{" "}
                    <strong className="text-foreground">
                      alterado pela equipe técnica
                    </strong>{" "}
                    antes do envio.
                  </p>
                </CardContent>
              </Card>
              <input type="hidden" name="text_override" value="on" />
              <Textarea
                name="custom_body_text"
                rows={6}
                maxLength={1024}
                value={customBodyText}
                onChange={(e) => setCustomBodyText(e.target.value)}
                placeholder={"Opa {{1}}! Temos novidade: {{2}}."}
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{1}}"}, {"{{2}}"}... para variáveis.{" "}
                {customBodyText.length}/1024
              </p>
            </>
          ) : (
            <div className="rounded-md border bg-muted/20 p-3">
              <HighlightedBody bodyText={currentBodyText} />
            </div>
          )}
        </div>

        {variableIndexes.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-md border p-3">
            <p className="text-sm font-medium">
              Variáveis da sua campanha{" "}
              <span className="font-normal text-destructive">
                (obrigatório)
              </span>
            </p>
            {variableIndexes.map((index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-12 shrink-0 rounded bg-muted px-2 py-1 text-center font-mono text-xs">
                  {`{{${index}}}`}
                </span>
                <Input
                  name={`variable_example_${index}`}
                  placeholder={
                    VARIABLE_PLACEHOLDER_HINTS[index] ??
                    "Informação da sua campanha"
                  }
                  value={variableExamples[index] ?? ""}
                  onChange={(e) =>
                    setVariableExamples((prev) => ({
                      ...prev,
                      [index]: e.target.value,
                    }))
                  }
                  required
                  disabled={isPending}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esse template não tem variáveis.
          </p>
        )}

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
              onChange={(e) =>
                handleMediaFileChange(e.target.files?.[0] ?? null)
              }
              disabled={isPending}
            />
            {mediaError ? (
              <p className="text-xs text-destructive">{mediaError}</p>
            ) : null}
            {!mediaFile && (initial?.mediaUrl || selected?.mediaUrl) ? (
              <p className="text-xs text-muted-foreground">
                {initial?.mediaUrl
                  ? "Já existe um arquivo salvo. Envie um novo pra substituir."
                  : "Mídia padrão do template do catálogo. Envie um arquivo pra usar outro nessa campanha."}
              </p>
            ) : null}
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
            <p className="text-sm font-medium">
              Botões de ação (até {MAX_BUTTONS})
            </p>
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
            <div
              key={i}
              className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Select
                name={`button_${i + 1}_type`}
                value={slot.type}
                onValueChange={(value) =>
                  updateSlot(i, { type: value as TemplateButton["type"] })
                }
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
                placeholder={
                  slot.type === "url"
                    ? "URL"
                    : slot.type === "phone_number"
                      ? "Telefone"
                      : "—"
                }
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
            <p className="text-xs text-muted-foreground">
              Nenhum botão adicionado.
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending || !!mediaError}
          className="w-fit"
        >
          {isPending ? "Salvando..." : "Avançar"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <WhatsAppPreview
          mediaType={mediaType}
          mediaUrl={previewMediaUrl}
          bodyText={effectiveBodyText}
          footerText={footerTextState}
          buttons={previewButtons}
          variableValues={variableExamples}
          title="Prévia da mensagem"
        />
      </div>
    </form>
  );
}
