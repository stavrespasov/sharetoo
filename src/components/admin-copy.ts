import type { Lang } from "./common";

export function blockReasonName(reason: string, lang: Lang) {
  if (lang === "en") return reason;
  const names: Record<string, string> = { Maintenance: "Vzdrževanje", Manual: "Ročna blokada", Other: "Drugo" };
  return names[reason] ?? reason;
}

export function activityName(type: string, lang: Lang) {
  if (lang === "en") return type.replaceAll("_", " ");
  const names: Record<string, string> = {
    REQUESTED: "Povpraševanje prejeto", CONFIRMED: "Rezervacija potrjena", REJECTED: "Povpraševanje zavrnjeno",
    CANCELLED: "Rezervacija preklicana", PICKED_UP: "Prevzem zabeležen", RETURNED: "Vračilo zabeleženo",
    BOOKING_REQUESTED_CUSTOMER: "Prejem povpraševanja · stranka", BOOKING_REQUESTED_OWNER: "Novo povpraševanje · skrbnik",
    BOOKING_CONFIRMED_CUSTOMER: "Potrditev rezervacije · stranka", BOOKING_REJECTED_CUSTOMER: "Zavrnitev povpraševanja · stranka",
    BOOKING_CANCELLED_CUSTOMER: "Preklic rezervacije · stranka",
  };
  return names[type] ?? "Sprememba rezervacije";
}

export function adminError(error: unknown, lang: Lang) {
  const message = error instanceof Error ? error.message : "";
  if (lang === "en") return message || "The action could not be completed.";
  const translations: Record<string, string> = {
    "Incorrect demo password.": "Geslo za predstavitev ni pravilno.",
    "Owner sign-in is required.": "Prijavite se kot skrbnik.",
    "Open the owner demo first.": "Najprej odprite skrbniško predstavitev.",
    "Vehicle not found.": "Vozila ni mogoče najti.",
    "Booking not found.": "Rezervacije ni mogoče najti.",
    "This vehicle is currently offline.": "Vozilo trenutno ni v uporabi.",
    "This rental falls outside the bookable dates.": "Termin je zunaj obdobja za najem.",
    "Complete the main specifications, daily rate, and both descriptions before publishing.": "Za objavo izpolnite glavne podatke, dnevno ceno in oba opisa.",
    "This vehicle URL is already used.": "Ta naslov vozila je že v uporabi.",
    "This booking can no longer make that change.": "Za to rezervacijo te spremembe ni več mogoče narediti.",
    "Check the original documents and record the offline signatures.": "Preverite izvirnike dokumentov in potrdite podpis pogodbe.",
    "This block overlaps an existing allocation or turnaround.": "Blokada se prekriva z rezervacijo ali pripravo vozila.",
    "Resolve the existing price offer for these dates.": "Najprej uredite obstoječo cenovno ponudbo za ta termin.",
    "Review the rental length.": "Preverite dovoljeno trajanje najema.",
    "Choose valid local times and a return after pickup.": "Izberite veljaven termin, pri katerem je vračilo po prevzemu.",
    "The shared demo is temporarily unavailable.": "Skupna predstavitev trenutno ni na voljo.",
  };
  return translations[message] ?? (message.startsWith("Unavailable from ")
    ? "Vozilo v tem terminu ni na voljo."
    : "Spremembe ni bilo mogoče shraniti. Preverite podatke in poskusite znova.");
}
