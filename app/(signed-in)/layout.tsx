import { AppShell } from "@/components/AppShell";

/** Shared by /app and /admin. The proxy has already redirected anyone who may not be here. */
export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
