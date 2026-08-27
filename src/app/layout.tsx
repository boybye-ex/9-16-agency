import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "9:16 Adds | AI creative + social performance",
    template: "%s | 9:16 Adds",
  },
  description:
    "Generate images, edit vertical video, write captions, and get AI posting advice for Instagram, TikTok, and Facebook — for agencies and clients.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
