import { NextResponse } from "next/server";

// Usado pelo HEALTHCHECK do Dockerfile / painel de deploy. Não checa
// conectividade com o Supabase de propósito — só confirma que o processo
// Next.js está de pé e respondendo. Fica fora do matcher de auth do
// middleware (que já exclui /api/*).
export async function GET() {
  return NextResponse.json({ ok: true });
}
