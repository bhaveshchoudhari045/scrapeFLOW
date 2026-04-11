import React from "react";
import Logo from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="mb-8">
        <Logo fontSize="text-2xl" iconSize={22} />
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-2xl p-8">
          {children}
        </div>
      </div>

      {/* Footer text */}
      <p className="mt-8 text-sm text-muted-foreground">
        By continuing, you agree to our{" "}
        <a
          href="#"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
