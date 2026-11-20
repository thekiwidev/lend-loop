import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function SignUpPage() {
  return (
    <main className="ll-auth">
      <Logo size="lg" />
      <SignUp />
    </main>
  );
}
