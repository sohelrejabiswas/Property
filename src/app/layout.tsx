import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Land Management", template: "%s · Land Management" },
  description: "Manage and share your land listings.",
  robots: { index: false, follow: false }, // admin area is private; public pages override this
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#047857" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
