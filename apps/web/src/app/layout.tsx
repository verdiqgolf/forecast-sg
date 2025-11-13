// apps/web/src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ForeCast SG",
  description: "Voice → Strokes Gained dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">ForeCast SG</Link>
            <nav className="space-x-4 text-sm">
              <Link href="/rounds" className="hover:underline">Rounds</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
