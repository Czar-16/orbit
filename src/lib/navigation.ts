import {
  LayoutDashboard,
  Search,
  Bookmark,
  ListChecks,
  Kanban,
  FileUser,
  Settings,
} from "lucide-react";
export const navigation = [
  { href: "/", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  {
    href: "/discover",
    label: "Discover jobs",
    short: "Discover",
    icon: Search,
  },
  { href: "/saved", label: "Saved jobs", short: "Saved", icon: Bookmark },
  {
    href: "/queue",
    label: "Application queue",
    short: "Queue",
    icon: ListChecks,
  },
  {
    href: "/tracker",
    label: "Application tracker",
    short: "Tracker",
    icon: Kanban,
  },
  {
    href: "/profile",
    label: "Resume & profile",
    short: "Profile",
    icon: FileUser,
  },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
] as const;
export const mobileNavigation = navigation.filter((item) =>
  ["/", "/discover", "/queue", "/tracker"].includes(item.href),
);
export const moreNavigation = navigation.filter(
  (item) => !mobileNavigation.includes(item),
);
export function isActiveRoute(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
