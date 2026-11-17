import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: brand + " | Najem vozil v Kopru", template: "%s | " + brand },
  description: "Izberite vozilo in termin, preverite ceno ter pošljite povpraševanje za najem v Kopru.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="sl" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
