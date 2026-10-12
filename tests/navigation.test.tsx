import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/app-shell";
import { isActiveRoute, navigation } from "@/lib/navigation";
const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));
describe("workspace navigation", () => {
  it("matches exact and nested routes without prefix collisions", () => {
    expect(isActiveRoute("/", "/")).toBe(true);
    expect(isActiveRoute("/saved/123", "/saved")).toBe(true);
    expect(isActiveRoute("/saved-other", "/saved")).toBe(false);
    expect(isActiveRoute("/discover", "/")).toBe(false);
  });
  it.each(navigation)(
    "marks only $label active in the main navigation",
    (item) => {
      route.pathname = item.href;
      render(<AppShell>Page</AppShell>);
      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(
        within(nav).getByRole("link", { name: item.label }),
      ).toHaveAttribute("aria-current", "page");
      expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    },
  );
  it("opens More by keyboard, lists remaining routes, and restores focus on Escape", async () => {
    route.pathname = "/saved";
    const user = userEvent.setup();
    render(<AppShell>Page</AppShell>);
    const trigger = screen.getByRole("button", { name: "More navigation" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "More navigation" });
    expect(
      within(dialog)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/saved", "/profile", "/settings"]);
    expect(
      within(dialog).getByRole("link", { name: "Saved jobs" }),
    ).toHaveAttribute("aria-current", "page");
    const close = within(dialog).getByRole("button", {
      name: "Close navigation",
    });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(
      within(dialog).getByRole("link", { name: "Settings" }),
    ).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("closes More after selecting a route", async () => {
    const user = userEvent.setup();
    render(<AppShell>Page</AppShell>);
    await user.click(screen.getByRole("button", { name: "More navigation" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: "Settings",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("collapses and expands desktop navigation", async () => {
    const user = userEvent.setup();
    render(<AppShell>Page</AppShell>);
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
  it("keeps unavailable controls disabled and described", () => {
    render(<AppShell>Page</AppShell>);
    expect(screen.getByRole("button", { name: "Import job" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Run now" })).toBeDisabled();
    expect(
      screen.getByText("Import job requires local database setup."),
    ).toHaveAttribute("id", "import-reason");
  });
  it("opens manual intake when the real database is available", () => {
    render(<AppShell importAvailable>Page</AppShell>);
    expect(screen.getByRole("link", { name: "Import job" })).toHaveAttribute(
      "href",
      "/discover#import",
    );
    expect(screen.getByRole("button", { name: "Run now" })).toBeDisabled();
  });
});
