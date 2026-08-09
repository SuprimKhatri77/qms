import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavFooterWrapper } from "@/modules/landing/nav-footer-wrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Queueup — Digital queue management for local businesses",
    template: "%s · Queueup",
  },
  description:
    "Let customers join your walk-in queue from anywhere. Shop owners manage the live line; customers track their spot and arrive when it's nearly their turn.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
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
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <ReactQueryProvider>
          <NavFooterWrapper>{children}</NavFooterWrapper>
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
