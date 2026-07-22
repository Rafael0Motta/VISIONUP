import Link from "next/link";
import {
  Building2,
  CheckSquare,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Users,
  Megaphone,
  Webhook,
  FileSpreadsheet,
  ScrollText,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

const NAV_BY_ROLE = {
  superadmin: [
    { href: "/organizacoes", label: "Organizações", icon: Building2 },
    { href: "/aprovacoes", label: "Aprovações", icon: CheckSquare },
    { href: "/catalogo-variacoes", label: "Catálogo de Variações", icon: MessageSquareText },
    { href: "/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
    { href: "/auditoria", label: "Auditoria", icon: ScrollText },
    { href: "/central", label: "Central do Sistema", icon: SlidersHorizontal },
  ],
  admin: [
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/campanhas", label: "Campanhas", icon: Megaphone },
    { href: "/aprovacoes", label: "Aprovações", icon: CheckSquare },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ],
  cliente: [{ href: "/campanhas", label: "Campanhas", icon: Megaphone }],
};

async function resolveBrandText(profile: { role: "superadmin" | "admin" | "cliente"; organization_id: string | null }) {
  if (profile.role === "superadmin" || !profile.organization_id) return "Disparo Certo";

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, display_name")
    .eq("id", profile.organization_id)
    .single();

  if (!org) return "Disparo Certo";
  // Admin sempre vê o nome real (é quem gerencia o nome de exibição);
  // cliente vê o nome de exibição, se definido.
  return profile.role === "admin" ? org.name : (org.display_name || org.name);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const nav = NAV_BY_ROLE[profile.role];
  const brandText = await resolveBrandText(profile);

  const sidebarContent = (
    <>
      <div className="px-5 py-5">
        <span className="truncate text-lg font-semibold" title={brandText}>
          {brandText}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Navegação
        </p>
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
        <p className="truncate px-2 text-sm text-muted-foreground" title={profile.full_name ?? "Usuário"}>
          {profile.full_name ?? "Usuário"}
        </p>
        <Link
          href="/conta"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <KeyRound className="size-3.5" />
          Minha conta
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="w-full justify-center">
            <LogOut className="size-3.5" />
            Sair
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        {sidebarContent}
      </aside>

      <MobileNav brandText={brandText}>
        <div className="flex h-full flex-col">{sidebarContent}</div>
      </MobileNav>

      <main className="min-w-0 flex-1 bg-background p-4 sm:p-6">{children}</main>
    </div>
  );
}
