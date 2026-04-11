import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-2 text-center">Welcome Back</h1>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        Sign in to continue to FlowScrape
      </p>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-transparent shadow-none",
            formButtonPrimary:
              "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 transition-all",
            footerActionLink:
              "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
          },
        }}
      />
    </div>
  );
}
