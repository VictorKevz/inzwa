import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ProductsProvider } from "../contexts/ProductsContext";
import { RecommendationsProvider } from "../contexts/RecommendationsContext";
import VoiceWidget from "../components/VoiceWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inzwa Demo Store",
  description: "Voice-driven shopping experience",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script
          src="https://unpkg.com/@elevenlabs/convai-widget-embed@beta"
          strategy="afterInteractive"
        />
        <ProductsProvider>
          <RecommendationsProvider>
            {children}
            <VoiceWidget />
          </RecommendationsProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
