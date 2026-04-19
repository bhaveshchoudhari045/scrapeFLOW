import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <>
      <div className="auth-form-heading">
        <h1>Create your account</h1>
        <p>Start scraping and automating the web in minutes</p>
      </div>

      <SignUp
        appearance={{
          variables: {
            colorPrimary: "hsl(226, 92%, 58%)",
            colorBackground: "transparent",
            colorInputBackground: "var(--bg-2, #f5f6f8)",
            colorInputText: "var(--tx1, #0b0c10)",
            colorText: "var(--tx1, #0b0c10)",
            colorTextSecondary: "var(--tx3, #9299ad)",
            borderRadius: "9px",
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "14px",
          },
          elements: {
            rootBox: "w-full",
            card: "!bg-transparent !shadow-none !border-none !p-0 !rounded-none",
            header: "!hidden",
            headerTitle: "!hidden",
            headerSubtitle: "!hidden",
            footer: "!hidden",
            main: "!p-0",
            socialButtonsBlockButton:
              "!rounded-[9px] !border !border-[rgba(0,0,0,0.10)] !bg-[var(--bg-2,#f5f6f8)] !font-medium !text-[var(--tx1,#0b0c10)] !h-[42px] !text-sm !shadow-none transition-all hover:!border-[hsl(226,92%,58%)] hover:!bg-[hsl(226,92%,58%,0.08)]",
            socialButtonsBlockButtonText: "!font-medium",
            dividerRow: "!my-4",
            dividerText: "!text-[var(--tx3,#9299ad)] !text-xs",
            dividerLine: "!bg-[rgba(0,0,0,0.06)]",
            formFieldLabel:
              "!text-[0.82rem] !font-medium !text-[var(--tx2,#4a5068)]",
            formFieldInput:
              "!rounded-[9px] !border !border-[rgba(0,0,0,0.10)] !bg-[var(--bg-2,#f5f6f8)] !text-[var(--tx1,#0b0c10)] !h-[42px] !text-sm !shadow-none focus:!border-[hsl(226,92%,58%)] focus:!ring-2 focus:!ring-[hsl(226,92%,58%,0.12)]",
            formFieldErrorText: "!text-[hsl(0,84%,60%)] !text-[0.78rem]",
            formButtonPrimary:
              "!rounded-[9px] !h-[42px] !text-sm !font-bold !shadow-none !border-none !bg-gradient-to-r !from-[hsl(226,92%,62%)] !to-[hsl(226,92%,44%)] hover:!brightness-110 hover:!-translate-y-px transition-all",
            footerActionLink:
              "!text-[hsl(38,96%,52%)] !font-medium !no-underline hover:!underline",
            footerActionText: "!text-[var(--tx3,#9299ad)]",
            identityPreviewText: "!text-[var(--tx3,#9299ad)]",
            identityPreviewEditButton: "!text-[hsl(38,96%,52%)] !font-medium",
          },
        }}
      />
    </>
  );
}
