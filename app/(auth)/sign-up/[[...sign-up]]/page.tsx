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
