import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/archivo-narrow";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: brand + " | Car rental concept", template: "%s | " + brand },
  description: "Browse cars, get a rental quote and request a pickup in Ljubljana.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
