import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vision Smart Studio",
  description: "AI orchestration workspace for end-to-end project delivery",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
