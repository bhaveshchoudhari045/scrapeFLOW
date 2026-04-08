import Logo from "@/components/Logo";
import React from "react";
import { AmbientCanvas } from "@/components/AmbientCanvas";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full h-screen">
      <AmbientCanvas />
      {children}
    </div>
  );
}
