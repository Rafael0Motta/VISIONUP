import { Eye, ExternalLink, Image as ImageIcon, Phone, Send, Video } from "lucide-react";
import { renderBodyText, type TemplateButton } from "@/lib/templates/parse";

export function WhatsAppPreview({
  mediaType = "none",
  mediaUrl,
  bodyText,
  footerText,
  buttons = [],
  variableValues = {},
  title = "Preview WhatsApp",
}: {
  mediaType?: "none" | "image" | "video" | "text";
  /** URL real da mídia (assinada ou blob: local) — se ausente, mostra placeholder. */
  mediaUrl?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttons?: TemplateButton[];
  variableValues?: Record<number, string>;
  title?: string;
}) {
  const renderedText = renderBodyText(bodyText || "", variableValues);
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full max-w-xs rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Eye className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-none">{title}</p>
          <p className="text-xs text-muted-foreground">Pré-visualização</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-[#0c1a24] p-3">
        <div className="flex items-center justify-between text-[#8fa3ac]">
          <div className="flex items-center gap-2">
            <span className="size-7 rounded-full bg-[#2a3942]" />
            <span className="text-[11px]">visto por último hoje às {time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="size-3.5" />
            <Phone className="size-3.5" />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg rounded-tl-none bg-[#202c33] p-3 text-[#e9edef]">
          {mediaType === "image" || mediaType === "video" ? (
            mediaUrl ? (
              mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="max-h-48 w-full rounded-md object-cover" />
              ) : (
                <video src={mediaUrl} controls className="max-h-48 w-full rounded-md" />
              )
            ) : (
              <div className="flex h-28 items-center justify-center rounded-md bg-[#2a3942] text-[#8fa3ac]">
                {mediaType === "image" ? (
                  <ImageIcon className="size-6" />
                ) : (
                  <Video className="size-6" />
                )}
                <span className="ml-2 text-xs">
                  [{mediaType === "image" ? "Imagem" : "Vídeo"}]
                </span>
              </div>
            )
          ) : null}

          <p className="whitespace-pre-line text-sm">
            {renderedText || "Digite o texto da mensagem…"}
          </p>

          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8fa3ac]">
            <span>{time}</span>
          </div>
        </div>

        {footerText ? (
          <p className="px-1 text-[11px] text-[#8fa3ac]">{footerText}</p>
        ) : null}

        {buttons.slice(0, 3).map((btn, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <button
              type="button"
              className="w-full rounded-lg border border-[#2a3942] bg-[#111b21] py-2 text-center text-sm font-medium text-[#53bdeb]"
            >
              {btn.label || "Botão"}
            </button>
            {btn.type === "url" && btn.value ? (
              <a
                href={btn.value}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1 truncate px-1 text-center text-[10px] text-[#8fa3ac] hover:underline"
              >
                <ExternalLink className="size-2.5 shrink-0" />
                {btn.value}
              </a>
            ) : null}
            {btn.type === "phone_number" && btn.value ? (
              <p className="text-center text-[10px] text-[#8fa3ac]">{btn.value}</p>
            ) : null}
          </div>
        ))}

        <div className="flex items-center gap-2 rounded-full bg-[#2a3942] px-3 py-2 text-[#8fa3ac]">
          <span className="flex-1 text-xs">Mensagem</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Send className="size-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
