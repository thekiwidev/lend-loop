import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function SignInPage() {
  return (
    <main className="ll-auth">
      <Logo size="lg" />
      <SignIn />
    </main>
  );
}
