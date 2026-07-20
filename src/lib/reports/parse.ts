import * as XLSX from "xlsx";

export type ParsedReport = {
  enviados: number;
  entregues: number;
  lidos: number;
  falhados: number;
  expirados: number;
  custo: number | null;
  error: string | null;
};

const EMPTY_RESULT: Omit<ParsedReport, "error"> = {
  enviados: 0,
  entregues: 0,
  lidos: 0,
  falhados: 0,
  expirados: 0,
  custo: null,
};

const SUMMARY_HEADERS = {
  enviados: ["enviados", "sent", "total_enviados", "total"],
  entregues: ["entregues", "delivered", "total_entregues"],
  lidos: ["lidos", "read", "seen", "total_lidos"],
  falhados: ["falhados", "failed", "failures", "undelivered", "total_falhados"],
  expirados: ["expirados", "expired", "total_expirados"],
  custo: ["custo", "cost", "valor", "price"],
};

const STATUS_HEADERS = ["status", "situacao", "situação", "delivery_status", "message_status"];

// Coluna separada que marca leitura (formato real de exportação da Infobip:
// "Visto em" só vem preenchida quando o contato leu a mensagem — não existe
// um status "Read" próprio, "Status" só cobre o resultado da entrega).
const SEEN_AT_HEADERS = ["visto em", "seen at", "lido em", "read at", "seen_at", "read_at"];

const DELIVERED_VALUES = ["delivered", "entregue"];
const READ_VALUES = ["read", "lido", "seen", "visto"];
// "Expired" fica separado — mensagem não entregue dentro da janela de
// tempo, é uma causa diferente de "Undeliverable" (rejeitada/impossível).
const EXPIRED_VALUES = ["expired", "expirado"];
const FAILED_VALUES = [
  "failed",
  "falhou",
  "falha",
  "undelivered",
  "undeliverable",
  "error",
  "erro",
  "rejected",
  "rejeitado",
];

function normalizeHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(normalizeHeader(h)));
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function parseReportFile(file: File): Promise<ParsedReport> {
  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { ...EMPTY_RESULT, error: "Não foi possível ler o arquivo. Confira o formato (CSV ou XLSX)." };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ...EMPTY_RESULT, error: "O arquivo não tem nenhuma planilha." };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
  });

  if (rows.length === 0) {
    return { ...EMPTY_RESULT, error: "O arquivo não tem nenhuma linha de dados." };
  }

  const headers = Object.keys(rows[0]);

  // 2) formato detalhado: uma linha por contato, com coluna de status
  // (checado antes do resumo — é o formato real de exportação da Infobip:
  // Data, Destinatário, Status, Visto em)
  const statusHeader = findHeader(headers, STATUS_HEADERS);
  if (statusHeader) {
    const seenAtHeader = findHeader(headers, SEEN_AT_HEADERS);
    let entregues = 0;
    let lidos = 0;
    let falhados = 0;
    let expirados = 0;

    for (const row of rows) {
      const status = normalizeHeader(String(row[statusHeader] ?? ""));
      if (DELIVERED_VALUES.includes(status)) entregues++;
      if (FAILED_VALUES.includes(status)) falhados++;
      if (EXPIRED_VALUES.includes(status)) expirados++;

      if (seenAtHeader) {
        if (String(row[seenAtHeader] ?? "").trim()) lidos++;
      } else if (READ_VALUES.includes(status)) {
        lidos++;
      }
    }

    return { enviados: rows.length, entregues, lidos, falhados, expirados, custo: null, error: null };
  }

  // 1) formato resumo: colunas com totais já agregados (soma todas as linhas)
  const enviadosHeader = findHeader(headers, SUMMARY_HEADERS.enviados);
  const entreguesHeader = findHeader(headers, SUMMARY_HEADERS.entregues);
  const falhadosHeader = findHeader(headers, SUMMARY_HEADERS.falhados);
  const expiradosHeader = findHeader(headers, SUMMARY_HEADERS.expirados);

  if (enviadosHeader || entreguesHeader || falhadosHeader || expiradosHeader) {
    const lidosHeader = findHeader(headers, SUMMARY_HEADERS.lidos);
    const custoHeader = findHeader(headers, SUMMARY_HEADERS.custo);

    let enviados = 0;
    let entregues = 0;
    let lidos = 0;
    let falhados = 0;
    let expirados = 0;
    let custo = 0;

    for (const row of rows) {
      if (enviadosHeader) enviados += toNumber(row[enviadosHeader]);
      if (entreguesHeader) entregues += toNumber(row[entreguesHeader]);
      if (lidosHeader) lidos += toNumber(row[lidosHeader]);
      if (falhadosHeader) falhados += toNumber(row[falhadosHeader]);
      if (expiradosHeader) expirados += toNumber(row[expiradosHeader]);
      if (custoHeader) custo += toNumber(row[custoHeader]);
    }

    return { enviados, entregues, lidos, falhados, expirados, custo: custoHeader ? custo : null, error: null };
  }

  return {
    ...EMPTY_RESULT,
    error:
      "Colunas não reconhecidas. Use colunas de totais (enviados, entregues, lidos, falhados, expirados) ou uma coluna de status por contato (com Data, Destinatário, Status, Visto em).",
  };
}
