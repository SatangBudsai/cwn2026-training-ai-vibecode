import type { Metadata, Viewport } from "next";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/600.css";
import "@fontsource/prompt/700.css";
import "@fontsource/prompt/800.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShopProvider } from "@/components/ShopProvider";
import { Toaster } from "@/components/Toaster";
import { currentPublicUser } from "@/lib/auth";
import { serverBugMode } from "@/lib/bugmode";
import { liveStock } from "@/lib/store";

// BUG_MODE, the session and live stock are read per request (never baked in at build time).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "PawPantry — อาหารแมวและสุนัขคัดพิเศษ",
    template: "%s · PawPantry",
  },
  description: "ร้านอาหารแมวและสุนัขออนไลน์ สำหรับฝึกเขียนเทสต์ด้วย Playwright",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF8EF",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const bugMode = serverBugMode();
  const user = await currentPublicUser();
  const stock = liveStock();

  return (
    <html lang="th" data-bug-mode={bugMode ? "1" : "0"}>
      <body>
        <ShopProvider initialUser={user} initialStock={stock} bugMode={bugMode}>
          <a href="#main" className="skip-link">
            ข้ามไปยังเนื้อหา
          </a>
          <Header />
          <main id="main" className="site-main">
            {children}
          </main>
          <Footer />
          <Toaster />
        </ShopProvider>
      </body>
    </html>
  );
}
