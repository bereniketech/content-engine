"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  FlaskConical,
  Search,
  FileText,
  Image as ImageIcon,
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
  Zap,
  Menu,
  X,
  Library,
  CalendarDays,
  Mic,
  Network,
  Users,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function isNavItemActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Hub",      href: "/dashboard",           icon: History },
  { label: "Research", href: "/dashboard/research",  icon: FlaskConical },
  { label: "SEO",      href: "/dashboard/seo",       icon: Search },
  { label: "Blog",     href: "/dashboard/blog",      icon: FileText },
  { label: "Images",   href: "/dashboard/images",    icon: ImageIcon },
];

const DISTRIBUTE_NAV_ITEMS: NavItem[] = [
  { label: "X / Twitter", href: "/dashboard/social/x",          icon: Twitter },
  { label: "LinkedIn",    href: "/dashboard/social/linkedin",    icon: Linkedin },
  { label: "Instagram",   href: "/dashboard/social/instagram",   icon: Instagram },
  { label: "Newsletter",  href: "/dashboard/social/newsletter",  icon: Mail },
  { label: "Medium",      href: "/dashboard/social/medium",      icon: BookOpen },
  { label: "Reddit",      href: "/dashboard/social/reddit",      icon: MessageSquare },
  { label: "Pinterest",   href: "/dashboard/social/pinterest",   icon: PinIcon },
];

const MANAGE_NAV_ITEMS: NavItem[] = [
  { label: "Calendar",      href: "/dashboard/calendar",      icon: Calendar },
  { label: "Analytics",     href: "/dashboard/analytics",     icon: BarChart2 },
  { label: "Library",       href: "/dashboard/library",       icon: Library },
  { label: "Brand Voice",   href: "/dashboard/brand-voice",   icon: Mic },
  { label: "Schedule",      href: "/dashboard/schedule",      icon: CalendarDays },
  { label: "Clusters",      href: "/dashboard/clusters",      icon: Network },
  { label: "Workspace",     href: "/dashboard/workspace",     icon: Users },
  { label: "Data Pipeline", href: "/dashboard/data-driven",   icon: Zap },
];

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const { label, href, icon: Icon } = item;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-[120ms]",
        isActive
          ? "border-l-[3px] border-primary bg-primary/[0.08] text-primary font-semibold"
          : "text-foreground-2 hover:bg-hover"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <hr className="my-2 border-sidebar-border" />;
  }
  return (
    <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-3">
      {label}
    </p>
  );
}

function NavSection({
  items,
  pathname,
  collapsed,
  onClickItem,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onClickItem?: () => void;
}) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={isNavItemActive(item.href, pathname)}
          collapsed={collapsed}
          onClick={onClickItem}
        />
      ))}
    </>
  );
}

interface CollapsibleNavGroupProps {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  pathname: string;
  defaultOpen?: boolean;
  collapsed?: boolean;
  onClickItem?: () => void;
}

function CollapsibleNavGroup({
  label,
  icon: GroupIcon,
  items,
  pathname,
  defaultOpen = false,
  collapsed = false,
  onClickItem,
}: CollapsibleNavGroupProps) {
  const isActiveGroup = items.some((item) => isNavItemActive(item.href, pathname));
  const [isOpen, setIsOpen] = useState(defaultOpen || isActiveGroup);

  if (collapsed) {
    // In collapsed sidebar mode, render items as plain nav links (icons only)
    return (
      <>
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isNavItemActive(item.href, pathname)}
            collapsed={true}
            onClick={onClickItem}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors duration-[120ms] hover:bg-hover",
          isActiveGroup ? "text-primary font-semibold" : "text-foreground-2"
        )}
      >
        <span className="flex items-center gap-3">
          <GroupIcon className="h-4 w-4 shrink-0" />
          {label}
        </span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClickItem}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors duration-[120ms] hover:bg-hover hover:text-foreground",
                  isActive
                    ? "border-l-[3px] border-primary bg-primary/[0.08] text-primary font-semibold"
                    : "text-foreground-2"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  collapsed,
  pathname,
  onClickItem,
}: {
  collapsed: boolean;
  pathname: string;
  onClickItem?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-4 flex-1 overflow-y-auto">
      <NavSection items={MAIN_NAV_ITEMS} pathname={pathname} collapsed={collapsed} onClickItem={onClickItem} />
      {!collapsed && <SectionLabel label="Distribute" collapsed={false} />}
      {collapsed && <hr className="my-2 border-sidebar-border" />}
      <CollapsibleNavGroup
        label="Distribute"
        icon={Share2}
        items={DISTRIBUTE_NAV_ITEMS}
        pathname={pathname}
        collapsed={collapsed}
        onClickItem={onClickItem}
      />
      <SectionLabel label="Manage" collapsed={collapsed} />
      <NavSection items={MANAGE_NAV_ITEMS} pathname={pathname} collapsed={collapsed} onClickItem={onClickItem} />
    </nav>
  );
}

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: string;
  credits: number | null;
}

function ProfileAvatar({ collapsed }: { collapsed: boolean }) {
  const [profile, setProfile] = useState<UserProfile>({ name: "", email: "", avatarUrl: null, plan: "Pro Plan", credits: null });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const user = session.user;
      const meta = user.user_metadata as Record<string, string> | undefined;
      const name = meta?.full_name ?? meta?.name ?? user.email ?? "";
      const avatarUrl = meta?.avatar_url ?? null;

      let credits: number | null = null;
      let plan = "Free";
      try {
        const [creditsRes, subRes] = await Promise.all([
          fetch("/api/credits/balance", { headers: { authorization: `Bearer ${session.access_token}` } }),
          fetch("/api/subscriptions/status", { headers: { authorization: `Bearer ${session.access_token}` } }),
        ]);
        if (creditsRes.ok) {
          const body = await creditsRes.json() as { balance: number };
          credits = body.balance;
        }
        if (subRes.ok) {
          const body = await subRes.json() as { plan_name: string | null };
          if (body.plan_name) plan = body.plan_name;
        }
      } catch { /* ignore */ }

      setProfile({ name, email: user.email ?? "", avatarUrl, plan, credits });
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const avatar = profile.avatarUrl ? (
    <Image src={profile.avatarUrl} alt={profile.name} width={28} height={28} className="rounded-full shrink-0 object-cover" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
      {initials || "?"}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[120ms] hover:bg-hover",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? profile.name : undefined}
      >
        {avatar}
        {!collapsed && (
          <span className="truncate text-sm font-medium text-foreground">
            {profile.name || "Account"}
          </span>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute bottom-full mb-2 z-50 w-64 rounded-lg border border-sidebar-border bg-card shadow-lg",
          collapsed ? "left-0" : "left-2"
        )}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
            <div className="shrink-0">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} width={40} height={40} className="rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {initials || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{profile.name || "Account"}</p>
              <p className="truncate text-[11px] text-foreground-3">{profile.email}</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground-3">Plan</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{profile.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground-3">Credits</span>
              <span className="text-[12px] font-medium text-foreground">
                {profile.credits !== null ? profile.credits.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
  }, []);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", next ? "true" : "false");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:shrink-0 bg-sidebar min-h-screen border-r border-sidebar-border transition-all duration-200",
          collapsed ? "md:w-[60px]" : "md:w-[248px]"
        )}
      >
        {/* Brand card */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border px-3 py-4",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <Image src="/logo.png" alt="Content Studio" width={36} height={36} className="rounded-sm object-cover shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground truncate">Content Studio</span>
              <span className="text-[11px] text-foreground-3">Pro Plan</span>
            </div>
          )}
        </div>

        {/* New Article button */}
        <div className="px-2 py-2">
          <Link
            href="/dashboard/new-session"
            className={cn(
              "flex items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground font-semibold h-10 transition-opacity hover:opacity-90",
              collapsed ? "w-10 mx-auto px-0" : "w-full"
            )}
            title={collapsed ? "New Article" : undefined}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New Article</span>}
          </Link>
        </div>

        <SidebarContent collapsed={collapsed} pathname={pathname} />

        {/* Footer */}
        <div className="border-t border-sidebar-border px-2 py-4 flex flex-col gap-1">
          <ProfileAvatar collapsed={collapsed} />
          <button
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground-2 hover:bg-hover transition-colors duration-[120ms]",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <div className="px-2 py-2 border-t border-sidebar-border">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center justify-center w-full h-9 rounded-sm hover:bg-hover transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4 text-foreground-2" />
              : <ChevronLeft className="h-4 w-4 text-foreground-2" />
            }
          </button>
        </div>
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-md bg-primary p-2 text-primary-foreground shadow-lg"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-[248px] bg-sidebar flex flex-col overflow-y-auto">
            {/* Brand card */}
            <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border">
              <Image src="/logo.png" alt="Content Studio" width={36} height={36} className="rounded-sm object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Content Studio</span>
                <span className="text-[11px] text-foreground-3">Pro Plan</span>
              </div>
            </div>

            <SidebarContent collapsed={false} pathname={pathname} onClickItem={() => setMobileOpen(false)} />

            {/* Footer */}
            <div className="mt-auto border-t border-sidebar-border px-2 py-4 flex flex-col gap-1">
              <ProfileAvatar collapsed={false} />
              <button className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-foreground-2 hover:bg-hover transition-colors">
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
