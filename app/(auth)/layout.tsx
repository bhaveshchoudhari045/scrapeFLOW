import React, { ReactNode } from "react";
import Logo from "@/components/Logo";
function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Logo />
      {children}
    </div>
  );
}

export default layout;
