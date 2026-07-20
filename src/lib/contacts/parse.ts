import Papa from "papaparse";

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length >= 10 && digits.length <= 13;
}

const PHONE_HEADERS = ["telefone", "phone", "celular", "numero", "número", "whatsapp"];
const NAME_HEADERS = ["nome", "name"];
const VARIABLE_HEADER_RE = /^(variavel|vari[aá]vel|var)_?(\d+)$/i;

export type ParsedContactRow = {
  phone: string;
  name: string | null;
  variables: Record<string, string>;
  isValid: boolean;
  validationError: string | null;
};

export type ParsedContacts = {
  rows: ParsedContactRow[];
  total: number;
  validCount: number;
  invalidCount: number;
  error: string | null;
};

export function parseContactsCsv(csvText: string): ParsedContacts {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { rows: [], total: 0, validCount: 0, invalidCount: 0, error: "Não foi possível ler o CSV. Confira o formato do arquivo." };
  }

  const headers = result.meta.fields ?? [];
  const phoneHeader = headers.find((h) => PHONE_HEADERS.includes(h));
  if (!phoneHeader) {
    return {
      rows: [],
      total: 0,
      validCount: 0,
      invalidCount: 0,
      error: `Coluna de telefone não encontrada. Use uma destas colunas: ${PHONE_HEADERS.join(", ")}.`,
    };
  }
  const nameHeader = headers.find((h) => NAME_HEADERS.includes(h));
  const variableHeaders = headers
    .map((h) => ({ header: h, match: h.match(VARIABLE_HEADER_RE) }))
    .filter((h): h is { header: string; match: RegExpMatchArray } => h.match !== null);

  const rows: ParsedContactRow[] = result.data.map((row) => {
    const rawPhone = String(row[phoneHeader] ?? "").trim();
    const valid = rawPhone.length > 0 && isValidPhone(rawPhone);
    const variables: Record<string, string> = {};
    for (const { header, match } of variableHeaders) {
      variables[match[2]] = String(row[header] ?? "").trim();
    }

    return {
      phone: normalizePhone(rawPhone),
      name: nameHeader ? String(row[nameHeader] ?? "").trim() || null : null,
      variables,
      isValid: valid,
      validationError: valid ? null : "Telefone em formato inválido",
    };
  });

  const validCount = rows.filter((r) => r.isValid).length;

  return { rows, total: rows.length, validCount, invalidCount: rows.length - validCount, error: null };
}
