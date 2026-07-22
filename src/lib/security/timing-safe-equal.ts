import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara dois segredos sem vazar informação por timing attack. Hasheia
 * ambos os lados antes de comparar (tamanho fixo de 32 bytes) — assim nem o
 * tamanho original das strings gera uma diferença de tempo mensurável.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
