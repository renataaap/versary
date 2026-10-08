import type { Metadata } from "next";
import "./globals.css";
import { AppLayoutShell } from "@/components/app-layout-shell";

export const metadata: Metadata = {
  title: "Versary | Manutenção Industrial · Marília",
  description: "Gestão de manutenção industrial da Coca-Cola FEMSA — Unidade Marília.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppLayoutShell>{children}</AppLayoutShell>
      </body>
    </html>
  );
}
