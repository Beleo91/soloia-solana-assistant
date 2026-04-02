import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLOIA — Solana Voice Intelligence",
  description:
    "The first voice-powered AI assistant for the Solana ecosystem. Speak naturally, get instant definitions from 1001 Solana terms — no hands required.",
  keywords: ["Solana", "AI", "Voice Assistant", "Blockchain", "Web3", "Developer Tools", "Superteam"],
  authors: [{ name: "Superteam Brazil" }],
  openGraph: {
    title: "SOLOIA — Solana Voice Intelligence",
    description: "Voice-powered Solana glossary assistant for developers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" style={{ height: "100%" }}>
      <body className="antialiased" style={{ minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
