import dayjs from "dayjs";

const rwLocale = {
  name: "loanapp-rw",
  weekdays: [
    "Ku cyumweru",
    "Ku wa mbere",
    "Ku wa kabiri",
    "Ku wa gatatu",
    "Ku wa kane",
    "Ku wa gatanu",
    "Ku wa gatandatu",
  ],
  weekdaysShort: ["Cyu", "Mbe", "Kab", "Gat", "Kan", "Gtn", "Gtd"],
  months: [
    "Mutarama",
    "Gashyantare",
    "Werurwe",
    "Mata",
    "Gicurasi",
    "Kamena",
    "Nyakanga",
    "Kanama",
    "Nzeli",
    "Ukwakira",
    "Ugushyingo",
    "Ukuboza",
  ],
  monthsShort: ["Mut", "Gas", "Wer", "Mat", "Gic", "Kam", "Nya", "Kan", "Nze", "Ukw", "Ugu", "Uku"],
  ordinal: (n: number) => `${n}`,
  formats: {
    LT: "HH:mm",
    LTS: "HH:mm:ss",
    L: "DD/MM/YYYY",
    LL: "D MMMM YYYY",
    LLL: "D MMMM YYYY HH:mm",
    LLLL: "dddd D MMMM YYYY HH:mm",
  },
  relativeTime: {
    future: "mu %s",
    past: "%s ishize",
    s: "amasegonda",
    m: "umunota",
    mm: "iminota %d",
    h: "isaha",
    hh: "amasaha %d",
    d: "umunsi",
    dd: "iminsi %d",
    M: "ukwezi",
    MM: "amezi %d",
    y: "umwaka",
    yy: "imyaka %d",
  },
};

dayjs.locale("loanapp-rw", rwLocale);

export function applyDayLocale(locale: "en" | "rw"): void {
  dayjs.locale(locale === "rw" ? "loanapp-rw" : "en");
}