"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({
  brandText,
  children,
}: {
  brandText: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
      <span className="truncate text-base font-semibold" title={brandText}>
        {brandText}
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <Menu className="size-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-72 flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
          onClick={() => setOpen(false)}
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    </div>
  );
}
