import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <>
      <div className="auth-form-heading">
        <h1>Welcome back</h1>
        <p>Sign in to your FlowScrape account to continue</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-none p-0",
            formButtonPrimary: "!shadow-none",
            footerActionLink: "!underline-offset-2",
          },
        }}
      />
    </>
  );
}
