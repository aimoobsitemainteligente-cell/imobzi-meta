import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ROTAS PÚBLICAS (NUNCA BLOQUEAR)
  // O webhook do Meta DEVE ser público para receber leads de anúncios
  if (
    pathname.startsWith("/api/webhook") ||
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // 2. VERIFICAÇÃO DE SESSÃO
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { valid } = await verifySessionToken(token);

  if (valid) {
    return NextResponse.next();
  }

  // 3. SE NÃO AUTENTICADO:
  // Se for requisição de API interna, retorna 401 Unauthorized
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Não autorizado. Faça login para acessar este recurso." },
      { status: 401 }
    );
  }

  // Se for página web, redireciona para a tela de login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas exceto arquivos estáticos
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
