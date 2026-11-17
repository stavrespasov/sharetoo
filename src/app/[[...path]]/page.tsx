import { notFound } from "next/navigation";
import Experience from "@/components/experience";
import { brand } from "@/lib/brand";
import { hosted } from "@/lib/demo/config";
import { Suspense } from "react";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const [first, second, third, fourth] = path;
  const publicPage = !first || (["cars", "booking"].includes(first) && !third) || (["faq", "contact", "terms", "privacy"].includes(first) && !second);
  const adminPage = first === "admin" && (!second || (["login", "calendar", "customers", "settings", "offers"].includes(second) && !third)
    || (second === "vehicles" && !fourth) || (second === "bookings" && (!fourth || fourth === "contract") && path.length <= 4));
  if (!publicPage && !adminPage) notFound();
  return <Suspense fallback={<main className="shell section">Loading {brand}…</main>}><Experience brand={brand} hosted={hosted()} /></Suspense>;
}
