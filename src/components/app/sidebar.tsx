"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Clapperboard,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Users,
  Video,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isAgency, roleLabel } from "@/lib/roles";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/studio/images", label: "AI Images", icon: ImageIcon },
  { href: "/studio/video", label: "Video Editor", icon: Video },
  { href: "/studio/captions", label: "Captions", icon: PenLine },
  { href: "/studio/scripts", label: "Scripts", icon: Clapperboard },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/projects", label: "Projects", icon: Clapperboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  pathname,
  agency,
  onNavigate,
}: {
  pathname: string;
  agency: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "bg-[rgba(0,187,255,0.12)] text-white"
                : "text-[#a8b3c2] hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
      {agency ? (
        <Link
          href="/clients"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            pathname.startsWith("/clients")
              ? "bg-[rgba(197,3,55,0.16)] text-white"
              : "text-[#a8b3c2] hover:bg-white/5 hover:text-white",
          )}
        >
          <Users className="h-4 w-4" />
          Clients
        </Link>
      ) : null}
    </>
  );
}

export function AppSidebar({
  name,
  role,
}: {
  name?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();
  const agency = isAgency(role);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[#071018] px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-display text-lg font-bold text-white">
          9:16 <span className="text-[#00bbff]">Adds</span>
        </Link>
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-[var(--line)] p-2 text-white"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-b border-[var(--line)] bg-[#071018] px-3 py-3 md:hidden">
          <p className="mb-3 px-3 text-xs text-[#a8b3c2]">
            {name} · {roleLabel(role)}
          </p>
          <nav className="space-y-1">
            <NavLinks pathname={pathname} agency={agency} onNavigate={() => setOpen(false)} />
          </nav>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#a8b3c2]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}

      <aside className="hidden h-screen w-[240px] shrink-0 flex-col border-r border-[var(--line)] bg-[#071018] md:sticky md:top-0 md:flex">
        <div className="px-5 py-6">
          <Link href="/dashboard" className="font-display text-xl font-bold text-white">
            9:16 <span className="text-[#00bbff]">Adds</span>
          </Link>
          <p className="mt-2 text-xs text-[#a8b3c2]">
            {name} · {roleLabel(role)}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <NavLinks pathname={pathname} agency={agency} />
        </nav>
        <div className="border-t border-[var(--line)] p-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#a8b3c2] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
