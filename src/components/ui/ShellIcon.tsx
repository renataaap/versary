export type ShellIconName = "dashboard" | "analysis" | "machine" | "classification" | "prediction" | "upload" | "table" | "menu" | "close" | "bell" | "help" | "logout" | "chevron" | "shield" | "external" | "clock" | "calendar" | "activity";
const paths: Record<ShellIconName, string> = {
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2",
  calendar: "M3 5h18v16H3z M7 3v4 M17 3v4 M3 11h18",
  activity: "M2 12h4l3-9 6 18 3-9h4",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  analysis: "M3 3v18h18 M7 14l4-5 4 3 6-8",
  machine: "M3 21V9l6 3V9l6 3V3h4l2 18H3z M7 17h1 M12 17h1 M17 17h1",
  classification: "M20 13l-7 7a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3z M7 7h.01",
  prediction: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z",
  upload: "M12 16V3 M7 8l5-5 5 5 M3 16v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4",
  table: "M3 3h18v18H3z M3 9h18 M9 9v12 M3 15h18",
  menu: "M3 6h18 M3 12h18 M3 18h18", close: "M6 6l12 12 M6 18L18 6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  help: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  logout: "M9 3H4v18h5 M9 12h12 M17 8l4 4-4 4", chevron: "M9 5l7 7-7 7",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z M8 12l3 3 5-6",
  external: "M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7",
};
export default function ShellIcon({ name }: { name: ShellIconName }) {
  return <svg className="shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
