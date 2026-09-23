"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  Users,
  ShieldCheck,
  ScrollText,
  Menu,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/elections", label: "Elections", icon: Vote },
  { href: "/admin/voters", label: "Voters", icon: Users },
  { href: "/admin/team", label: "Team", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-teal-tint text-teal"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface AdminShellProps {
  children: React.ReactNode;
  /** Rendered top-right, e.g. the signed-in officer's name + sign out. */
  actions?: React.ReactNode;
}

function AdminShell({ children, actions }: AdminShellProps) {
  return (
    <div className="min-h-full bg-background lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Link
          href="/admin"
          className="font-heading px-2 text-lg font-semibold text-navy"
        >
          SDEC
        </Link>
        <p className="px-2 pb-6 text-xs text-caption">Election commission</p>
        <NavLinks />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 p-4">
                <SheetTitle className="font-heading text-lg text-navy">
                  SDEC
                </SheetTitle>
                <div className="mt-6">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-heading text-base font-semibold text-navy">
              SDEC
            </span>
          </div>
          {actions}
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export { AdminShell };
