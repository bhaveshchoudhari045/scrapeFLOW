"use client";

import Link from "next/link";
import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  CoinsIcon,
  HomeIcon,
  Layers2Icon,
  MenuIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Logo from "./Logo";
import { Button, buttonVariants } from "./ui/button";
import { usePathname } from "next/navigation";
import UserAvailableCreditsBadge from "./UserAvailableCreditsBadge";

const routes = [
  { href: "dashboard", label: "Home", icon: HomeIcon },
  { href: "workflows", label: "Workflows", icon: Layers2Icon },
  { href: "flowscrape", label: "FlowScrape", icon: SearchIcon },
  { href: "credentials", label: "Credentials", icon: ShieldCheckIcon },
  { href: "billing", label: "Billing", icon: CoinsIcon },
];

function DesktopSidebar() {
  const pathname = usePathname();
  const activeRoute =
    routes.find((r) => r.href.length > 0 && pathname.includes(r.href)) ??
    routes[0];

  return (
    <div
      className="hidden md:flex flex-col min-w-[260px] max-w-[260px] h-screen overflow-hidden"
      style={{
        background: "var(--bg-card)",
        /* Depth shadow separation — no hard border */
        boxShadow:
          "2px 0 16px rgba(0,0,0,0.06), 1px 0 0 var(--rule), 2px 0 8px var(--p-glow, rgba(245,158,11,0.12))",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center gap-2 p-4"
        style={{ boxShadow: "0 1px 0 var(--rule), 0 2px 8px rgba(0,0,0,0.03)" }}
      >
        <Logo />
      </div>

      {/* Credits badge */}
      <div className="p-2" style={{ boxShadow: "0 1px 0 var(--rule)" }}>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, var(--p-dim, rgba(245,158,11,0.10)), var(--a-dim, rgba(61,91,254,0.10)))",
            boxShadow:
              "0 2px 8px var(--p-glow, rgba(245,158,11,0.15)), 0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <UserAvailableCreditsBadge />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col p-2.5 gap-1 flex-1">
        {routes.map((route) => {
          const isActive = activeRoute.href === route.href;
          return (
            <Link
              key={route.href}
              href={`/${route.href}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative"
              style={{
                color: isActive ? "var(--primary)" : "var(--tx2)",
                background: isActive
                  ? "linear-gradient(135deg, var(--p-dim, rgba(245,158,11,0.10)), var(--a-dim, rgba(61,91,254,0.06)))"
                  : "transparent",
                boxShadow: isActive
                  ? "inset 0 0 0 1px var(--p-dim, rgba(245,158,11,0.18)), 0 2px 8px var(--p-glow, rgba(245,158,11,0.12))"
                  : "none",
                fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background =
                    "var(--p-dim, rgba(245,158,11,0.08))";
                  e.currentTarget.style.color = "var(--primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--tx2)";
                }
              }}
            >
              {/* Active indicator bar — primary gradient */}
              {isActive && (
                <span
                  className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--primary-lt), var(--primary-dp))",
                    boxShadow: "0 0 8px var(--primary-glow)",
                  }}
                />
              )}
              <route.icon
                size={18}
                style={{
                  color: isActive ? "var(--primary)" : "var(--tx3)",
                  filter: isActive
                    ? "drop-shadow(0 0 4px var(--primary-glow))"
                    : "none",
                  transition: "all 0.2s ease",
                }}
              />
              {route.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer gradient accent */}
      <div
        className="h-[2px] mx-4 mb-4 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, var(--primary-lt), var(--accent-lt))",
          opacity: 0.4,
          boxShadow: "0 0 8px var(--primary-glow)",
        }}
      />
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [isOpen, setOpen] = React.useState(false);
  const activeRoute =
    routes.find((r) => r.href.length > 0 && pathname.includes(r.href)) ??
    routes[0];

  return (
    <div className="block md:hidden" style={{ background: "var(--bg-card)" }}>
      <nav className="flex items-center px-4 py-2">
        <Sheet open={isOpen} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="w-[280px] space-y-4 p-4"
            side="left"
            style={{
              background: "var(--bg-card)",
              border: "none",
              boxShadow: "4px 0 24px rgba(0,0,0,0.15), 2px 0 8px var(--p-glow)",
            }}
          >
            <Logo />
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--p-dim), var(--a-dim))",
                boxShadow: "0 2px 8px var(--p-glow)",
              }}
            >
              <UserAvailableCreditsBadge />
            </div>
            <nav className="flex flex-col gap-1">
              {routes.map((route) => {
                const isActive = activeRoute.href === route.href;
                return (
                  <Link
                    key={route.href}
                    href={`/${route.href}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative"
                    style={{
                      color: isActive ? "var(--primary)" : "var(--tx2)",
                      background: isActive ? "var(--p-dim)" : "transparent",
                      fontWeight: isActive ? 700 : 500,
                      textDecoration: "none",
                    }}
                    onClick={() => setOpen(false)}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r"
                        style={{
                          background:
                            "linear-gradient(180deg, var(--primary-lt), var(--primary-dp))",
                          boxShadow: "0 0 8px var(--primary-glow)",
                        }}
                      />
                    )}
                    <route.icon
                      size={18}
                      style={{
                        color: isActive ? "var(--primary)" : "var(--tx3)",
                      }}
                    />
                    {route.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}

export default DesktopSidebar;
