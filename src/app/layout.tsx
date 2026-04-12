import type { Metadata } from "next";
import { Syne, DM_Sans, Geist, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import "@rainbow-me/rainbowkit/styles.css";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: 'Stashflow | Save with purpose',
  description: 'DeFi made simple. Set goals, and earn yield while you wait.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Stashflow | Save with purpose',
    description: 'Goal-based DeFi savings powered by LI.FI Earn',
    url: 'https://stashflow-two.vercel.app',
    siteName: 'Stashflow',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stashflow | Save with purpose',
    description: 'Goal-based DeFi savings powered by LI.FI Earn',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", syne.variable, dmSans.variable, outfit.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0F] text-white">
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

