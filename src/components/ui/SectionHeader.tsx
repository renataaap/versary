import type { ReactNode } from "react";

export default function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="front-section-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {action && <div className="front-section-actions">{action}</div>}
    </header>
  );
}
