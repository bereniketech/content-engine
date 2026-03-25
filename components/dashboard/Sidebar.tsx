"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FlaskConical,
  Search,
  FileText,
  Image,
  Twitter,
  Linkedin,
  Instagram,
  BookOpen,
  MessageSquare,
  Mail,
  PinIcon,
  Calendar,
  BarChart2,
  History,
  Repeat,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Research",   href: "/dashboard/research",               icon: FlaskConical },
  { label: "SEO",        href: "/dashboard/seo",                    icon: Search },
  { label: "Blog",       href: "/dashboard/blog",                   icon: FileText },
  { label: "Images",     href: "/dashboard/images",                 icon: Image },
  { label: "X",          href: "/dashboard/social/x",               icon: Twitter },
  { label: "LinkedIn",   href: "/dashboard/social/linkedin",        icon: Linkedin },
  { label: "Instagram",  href: "/dashboard/social/instagram",       icon: Instagram },
  { label: "Medium",     href: "/dashboard/social/medium",          icon: BookOpen },
  { label: "Reddit",     href: "/dashboard/social/reddit",          icon: MessageSquare },
  { label: "Newsletter", href: "/dashboard/social/newsletter",      icon: Mail },
  { label: "Pinterest",  href: "/dashboard/social/pinterest",       icon: PinIcon },
  { label: "Calendar",   href: "/dashboard/calendar",               icon: Calendar },
  { label: "Analytics",  href: "/dashboard/analytics",              icon: BarChart2 },
  { label: "History",    href: "/dashboard",                        icon: History },
  { label: "Flywheel",   href: "/dashboard/flywheel",               icon: Repeat },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-active text-primary-foreground"
                : "text-sidebar-fg hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:shrink-0 bg-sidebar-bg min-h-screen">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-sm font-semibold text-white tracking-wide">Content Engine</span>
        </div>
        {navLinks}
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-md bg-sidebar-bg p-2 text-white shadow-lg"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-56 bg-sidebar-bg flex flex-col">
            <div className="flex h-14 items-center border-b border-white/10 px-4">
              <span className="text-sm font-semibold text-white tracking-wide">Content Engine</span>
            </div>
            {navLinks}
          </aside>
        </>
      )}
    </>
  );
}
