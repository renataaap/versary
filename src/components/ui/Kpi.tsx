import ShellIcon, { type ShellIconName } from "./ShellIcon";

export default function Kpi({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: ShellIconName }) {
  return (
    <article className="front-kpi">
      <div className="front-kpi-heading"><p>{title}</p><span><ShellIcon name={icon} /></span></div>
      <strong>{value}</strong>
      <p className="front-kpi-detail">{detail}</p>
    </article>
  );
}
