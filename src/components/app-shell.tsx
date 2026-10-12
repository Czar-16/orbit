"use client";
import { useState } from "react";
import Link from "next/link";
import { RunDailyButton } from "@/components/run-daily-button";
import { usePathname } from "next/navigation";
import {
  CircleDot,
  Monitor,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import {
  navigation,
  mobileNavigation,
  moreNavigation,
  isActiveRoute,
} from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
function NavLink({
  item,
  pathname,
  compact = false,
  mobile = false,
}: {
  item: (typeof navigation)[number];
  pathname: string;
  compact?: boolean;
  mobile?: boolean;
}) {
  const active = isActiveRoute(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "nav-link",
        active && "active",
        compact && "compact",
        mobile && "mobile-link",
      )}
    >
      <item.icon size={19} aria-hidden="true" />
      <span className={compact ? "desktop-label" : undefined}>
        {mobile ? item.short : item.label}
      </span>
    </Link>
  );
}
export function AppShell({
  children,
  importAvailable = false,
}: {
  children: React.ReactNode;
  importAvailable?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const current = navigation.find((item) => isActiveRoute(pathname, item.href));
  return (
    <div className={cn("app-shell", collapsed && "sidebar-collapsed")}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Orbit dashboard">
          <CircleDot size={24} className="text-accent" aria-hidden="true" />
          <span className="desktop-label">Orbit</span>
        </Link>
        <nav aria-label="Main navigation" className="space-y-1 p-2">
          {navigation.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} compact />
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="desktop-label text-xs text-text-muted">
            Your local application workspace
          </span>
          <Button
            variant="ghost"
            className="collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="min-w-0 truncate text-sm text-text-muted">
            {current?.label ?? "Orbit"}
          </span>
          <div className="topbar-actions">
            <span className="local-badge">
              <Monitor size={13} aria-hidden="true" />
              Local mode
            </span>
            {importAvailable ? (
              <Button asChild variant="secondary">
                <Link href="/discover#import">
                  <Plus size={16} aria-hidden="true" />
                  Import job
                </Link>
              </Button>
            ) : (
              <span
                tabIndex={0}
                role="group"
                aria-label="Import job unavailable. Set up the local database first."
                title="Set up the local database first."
              >
                <Button
                  disabled
                  variant="secondary"
                  aria-describedby="import-reason"
                >
                  <Plus size={16} aria-hidden="true" />
                  Import job
                </Button>
              </span>
            )}
            <RunDailyButton available={importAvailable} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="content">
          {children}
          <div className="availability-note">
            <p id="import-reason">
              {importAvailable
                ? "Import links, descriptions, or CSV/JSON lists manually. No listing pages are fetched."
                : "Import job requires local database setup."}
            </p>
            <p id="run-reason">
              {importAvailable
                ? "Run now queues daily processing on the local Inngest server."
                : "Run now requires local database setup."}
            </p>
          </div>
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="bottom-nav">
        {mobileNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} mobile />
        ))}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "nav-link mobile-link",
                moreNavigation.some((item) =>
                  isActiveRoute(pathname, item.href),
                ) && "active",
              )}
              aria-label="More navigation"
            >
              <MoreHorizontal size={19} aria-hidden="true" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent>
            <nav aria-label="More navigation" className="space-y-1">
              {moreNavigation.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "nav-link",
                      isActiveRoute(pathname, item.href) && "active",
                    )}
                    aria-current={
                      isActiveRoute(pathname, item.href) ? "page" : undefined
                    }
                  >
                    <item.icon size={19} aria-hidden="true" />
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
