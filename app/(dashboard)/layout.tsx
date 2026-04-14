import BreadcrumbHeader from "@/components/BreadcrumbHeader";
import DesktopSidebar from "@/components/Sidebar";
import React from "react";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "@/app/dashboard.css";

async function layout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect("/");

  return (
    // ambient-bg class adds the dual-color radial mesh from globals.css
    <div className="app-shell ambient-bg">
      <DesktopSidebar />

      <div
        className="flex flex-col flex-1 min-h-screen overflow-hidden"
        style={{ position: "relative", zIndex: 1 }}
      >
        <header className="app-header">
          <BreadcrumbHeader />
          <div className="flex items-center gap-2.5">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>

        <div className="overflow-auto flex-1">
          {/* Remove the extra container class & Tailwind padding — dashboard.css handles it */}
          <div className="page-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default layout;
