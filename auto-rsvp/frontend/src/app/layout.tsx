import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Auto-RSVP | SXSW 2026",
  description:
    "Automatically sign up for SXSW 2026 events based on your interests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
