import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Embedding Inference Server",
  description: "Interactive demo for a production-style embedding server with async batching and Redis caching",
  openGraph: {
    title: "Embedding Inference Server",
    description: "Real-time text embeddings with 90% lower latency via async batching and Redis caching",
    type: "website",
    url: "https://github.com/sbui056/embedding-inference-server",
  },
  twitter: {
    card: "summary",
    title: "Embedding Inference Server",
    description: "Real-time text embeddings with 90% lower latency via async batching and Redis caching",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
