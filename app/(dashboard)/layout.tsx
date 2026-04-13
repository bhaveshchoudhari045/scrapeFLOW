import BreadcrumbHeader from "@/components/BreadcrumbHeader";
import DesktopSidebar from "@/components/Sidebar";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import "@/app/dashboard.css";
async function layout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect("/");

  return (
    <div className="app-shell">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        <header className="app-header justify-between">
          <BreadcrumbHeader />
          <div className="gap-2 flex items-center">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>
        <Separator />
        <div className="overflow-auto flex-1">
          <div className="page-content container p-8 py-6 text-accent-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default layout;
