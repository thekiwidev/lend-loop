import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// UX gate: decides which page to show before anything renders. Convex checks again on
// every call, so this is never the only thing standing between a user and data.
//
//                        signed out        signed in user   signed in admin
// /, /sign-in, /sign-up  render            -> /app          -> /app
// /app*                  -> /sign-in       render           render
// /admin*                -> /sign-in       -> /app          render

const isGuestOnly = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isApp = createRouteMatcher(["/app(.*)"]);
const isAdmin = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!userId) {
    if (isApp(request) || isAdmin(request)) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("redirect_url", request.nextUrl.pathname);
      return NextResponse.redirect(signIn);
    }
    return;
  }

  if (isGuestOnly(request)) return redirect("/app");
  // Role comes from Clerk public metadata, which users cannot edit. A `role` claim in the
  // session token answers without a network call; otherwise ask Clerk, on /admin only.
  if (isAdmin(request) && sessionClaims?.role !== "admin") {
    const user = await (await clerkClient()).users.getUser(userId);
    if (user.publicMetadata.role !== "admin") return redirect("/app");
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
