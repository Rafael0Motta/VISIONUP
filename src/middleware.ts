import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // /api/* fica de fora: são callbacks do n8n autenticados por token de
  // serviço (Authorization: Bearer), não por sessão de usuário — o redirect
  // pro /login quebraria esses endpoints.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
