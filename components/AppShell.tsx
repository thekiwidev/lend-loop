"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { cx } from "@/lib/cx";
import { errorMessage } from "@/lib/errors";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Sidebar, type NavItem } from "./Sidebar";
import { Skeleton } from "./Skeleton";
import { ThemeToggle } from "./ThemeToggle";

const NavDrawer = createContext({ open: false, toggle: () => {} });

export function useNavDrawer() {
  return useContext(NavDrawer);
}

function activeId(pathname: string): string {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/app/listings")) return "listings";
  if (pathname.startsWith("/app/incoming")) return "incoming";
  if (pathname.startsWith("/app/requests")) return "requests";
  return "tools";
}

/**
 * Sidebar and main column for every signed-in page. Upserts the user row once, then renders
 * the page; pages query Convex only while signed in and after that, so their access checks
 * find the user and signing out never leaves a page querying without a token.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  // Clerk's own profile, so the account menu (and Sign out) works even when Convex is down.
  const { user: clerkUser } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const sync = useAction(api.users.sync);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Bumped by "Try again" so the sync effect runs again.
  const [attempt, setAttempt] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const ready = isAuthenticated && synced;
  const me = useQuery(api.users.me, ready ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated || synced) return;
    sync({})
      .then(() => setSynced(true))
      .catch((e: unknown) => setSyncError(errorMessage(e)));
  }, [isAuthenticated, synced, sync, attempt]);

  const items: NavItem[] = [
    { id: "tools", label: "All tools", icon: "grid", href: "/app", section: "Browse" },
    { id: "listings", label: "My listings", icon: "wrench", href: "/app/listings", section: "Lending", count: me?.counts.listings },
    { id: "incoming", label: "Incoming requests", icon: "inbox", href: "/app/incoming", section: "Lending", count: me?.counts.incomingPending, urgent: true },
    { id: "requests", label: "My requests", icon: "send", href: "/app/requests", section: "Borrowing", count: me?.counts.myPending },
    ...(me?.isAdmin ? [{ id: "admin", label: "Admin", icon: "admin", href: "/admin", section: "Neighbourhood" }] : []),
  ];
  const role = [me?.isAdmin ? "Admin" : null, me?.trustedLender ? "Trusted lender" : null].filter(Boolean).join(" · ");

  let content: ReactNode;
  if (syncError) {
    content = (
      <Banner
        tone="danger"
        title="Couldn’t set up your account"
        action={
          <span style={{ display: "inline-flex", gap: 8 }}>
            <Button size="sm" variant="ghost" icon="logout" onClick={() => clerk.signOut({ redirectUrl: "/" })}>
              Sign out
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSyncError(null);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </span>
        }
      >
        {syncError}
      </Banner>
    );
  } else if (isSignedIn && !isLoading && !isAuthenticated) {
    content = (
      <Banner tone="danger" title="LendLoop couldn’t confirm your sign-in">
        Clerk signed you in but Convex rejected the token. Check the Clerk JWT template named convex and CLERK_JWT_ISSUER_DOMAIN.
      </Banner>
    );
  } else if (!ready) {
    // Also covers signing out: the page unmounts before its queries lose their token.
    content = <Skeleton lines={4} />;
  } else {
    content = children;
  }

  return (
    <NavDrawer.Provider value={{ open: drawerOpen, toggle: () => setDrawerOpen((o) => !o) }}>
      <div className={cx("ll-shell", drawerOpen && "is-nav-open")}>
        <Sidebar
          items={items}
          active={activeId(pathname)}
          onNavigate={() => setDrawerOpen(false)}
          user={
            me
              ? { name: me.name, email: me.email, role: role || "Neighbour", trusted: me.trustedLender }
              : clerkUser
                ? { name: clerkUser.fullName ?? "Your account", email: clerkUser.primaryEmailAddress?.emailAddress, role: "Neighbour" }
                : undefined
          }
          userActions={[
            { label: "Manage account", icon: "users", onClick: () => clerk.openUserProfile() },
            { label: "Sign out", icon: "logout", onClick: () => clerk.signOut({ redirectUrl: "/" }) },
          ]}
          footer={
            <div className="ll-sidebar__theme">
              <ThemeToggle compact />
            </div>
          }
        />
        <button type="button" className="ll-backdrop" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
        <div className="ll-main">{content}</div>
      </div>
    </NavDrawer.Provider>
  );
}
