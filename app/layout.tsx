import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Branch View",
  description: "A person sees only the people below them. The database enforces it.",
  // This demo has no icon. An empty one stops browsers logging a 404 for a missing favicon.
  icons: { icon: "data:," },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <main className="mx-auto max-w-5xl space-y-6 p-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-6 text-sm text-gray-600">
          Demo data only. The database decides what you see. The page does no filtering.
        </footer>
      </body>
    </html>
  );
}
