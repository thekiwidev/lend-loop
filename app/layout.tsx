import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { THEME_STORAGE_KEY } from "@/components/ThemeToggle";
import { Providers } from "./providers";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--ll-font-display", weight: ["500", "600", "700", "800"] });
const sans = Figtree({ subsets: ["latin"], variable: "--ll-font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--ll-font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don't.",
};

// Runs before first paint: the saved choice, else the system preference. No flash of the wrong theme.
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

const clerkAppearance = {
  variables: {
    colorPrimary: "#24573f",
    fontFamily: "var(--font-sans)",
    borderRadius: "10px",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
