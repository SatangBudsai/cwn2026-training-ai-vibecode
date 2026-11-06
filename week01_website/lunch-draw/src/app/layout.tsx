import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ข้าวไหนดี · สีลม",
  description: "จับสลากร้านข้าวกลางวันรอบจันวาณิชย์ สีลม ตามแนวอาหารที่ทีมโหวต",
};

export const viewport: Viewport = { themeColor: "#141415" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 sm:px-8">{children}</main>
        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 text-xs text-fg-3 sm:px-8">
          ข้อมูลร้าน © OpenStreetMap contributors · แผนที่ © CARTO · ออกแบบตามแนวทาง unslop by @heydamir
        </footer>
      </body>
    </html>
  );
}
