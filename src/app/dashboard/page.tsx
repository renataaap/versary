"use client";

import Link from "next/link";
import Kpi from "@/components/ui/Kpi";
import SectionHeader from "@/components/ui/SectionHeader";
import ShellIcon, { type ShellIconName } from "@/components/ui/ShellIcon";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardData = {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

type Occurrence = {
  date: Date;
  equipment: string;
  cause: string;
  category: string;
  minutes: number | null;
};

type CauseTotal = {
  name: string;
  minutes: number;
  percentage: number;
};

type DashboardSummary = {
  month: Date;
  causeGroupLabel: string;
  assetLabel: string;
  assetSingular: string;
  hasAssets: boolean;
  hasMinutes: boolean;
  occurrences: Occurrence[];
  daily: { label: string; count: number }[];
  causes: CauseTotal[];
  totalMinutes: number | null;
  averageMinutes: number | null;
  affectedEquipment: number;
  recent: Occurrence[];
};

const causeColors = ["#da291c", "#a7352d", "#b8736d", "#8a1538", "#b08d57", "#596270"];

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function findPopulatedColumn(data: DashboardData, pattern: RegExp) {
  return data.columns.find((column) =>
    pattern.test(normalizeText(column))
    && data.rows.some((row) => String(row[column] ?? "").trim() !== ""),
  );
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  if (!text) return null;

  const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brazilianDate) {
    const date = new Date(Number(brazilianDate[3]), Number(brazilianDate[2]) - 1, Number(brazilianDate[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4,6}(?:[.,]\d+)?$/.test(text)) {
    const serial = Number(text.replace(",", "."));
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMinutes(value: unknown): number | null {
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const minutes = Number(normalized);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildSummary(data: DashboardData): DashboardSummary | null {
  const dateColumn = findPopulatedColumn(data, /data|date|inicio|abertura|ocorrencia/);
  if (!dateColumn) return null;

  const minutesColumn = findPopulatedColumn(data, /minuto.*parada|total.*minuto|tempo|minute|duration|duracao/)
    ?? findPopulatedColumn(data, /minuto/);
  const equipmentColumn = findPopulatedColumn(data, /equipamento|equipment|maquina|machine|descripcion.*equipo|equipo_padre|tecnica.*tag/);
  const lineColumn = findPopulatedColumn(data, /linha|line/);
  const assetColumn = equipmentColumn ?? lineColumn;
  const causeColumn = findPopulatedColumn(data, /chave.*parada|subchave|observa|failure|cause|causa|motivo|defeito|falha/)
    ?? findPopulatedColumn(data, /tipo.*parada/);

  const allOccurrences = data.rows.flatMap((row) => {
    const date = parseDate(row[dateColumn]);
    if (!date) return [];
    const equipment = String(assetColumn ? row[assetColumn] ?? "" : "").trim();
    const cause = String(causeColumn ? row[causeColumn] ?? "" : "").trim();
    const normalizedCause = cause || "Causa não informada";
    return [{
      date,
      equipment: equipment || (equipmentColumn
        ? "Equipamento não informado"
        : lineColumn ? "Linha não informada" : "Ativo não informado"),
      cause: normalizedCause,
      category: causeColumn ? normalizedCause : equipment || "Categoria não informada",
      minutes: minutesColumn ? parseMinutes(row[minutesColumn]) : null,
    }];
  });

  if (!allOccurrences.length) return null;

  const latestDate = allOccurrences.reduce(
    (latest, occurrence) => occurrence.date > latest ? occurrence.date : latest,
    allOccurrences[0].date,
  );
  const month = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
  const occurrences = allOccurrences
    .filter(({ date }) => date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth())
    .sort((first, second) => second.date.getTime() - first.date.getTime());
  const totalMinutesValues = occurrences.flatMap(({ minutes }) => minutes === null ? [] : [minutes]);
  const totalMinutes = totalMinutesValues.length
    ? totalMinutesValues.reduce((sum, minutes) => sum + minutes, 0)
    : null;
  const averageMinutes = totalMinutesValues.length
    ? totalMinutesValues.reduce((sum, minutes) => sum + minutes, 0) / totalMinutesValues.length
    : null;
  const latestMonthDate = occurrences[0]?.date ?? latestDate;
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(latestMonthDate.getFullYear(), latestMonthDate.getMonth(), latestMonthDate.getDate() - 6 + index);
    const count = allOccurrences.filter((occurrence) => getDayKey(occurrence.date) === getDayKey(date)).length;
    return {
      label: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }).replace(".", ""),
      count,
    };
  });
  const causeMinutes = new Map<string, number>();
  occurrences.forEach(({ category, minutes }) => {
    if (minutes !== null && minutes > 0) {
      causeMinutes.set(category, (causeMinutes.get(category) ?? 0) + minutes);
    }
  });
  const causeTotals = Array.from(causeMinutes, ([name, minutes]) => ({ name, minutes }))
    .sort((first, second) => second.minutes - first.minutes);
  const topCauses = causeTotals.slice(0, 5);
  const otherMinutes = causeTotals.slice(5).reduce((sum, cause) => sum + cause.minutes, 0);
  if (otherMinutes > 0) topCauses.push({ name: "Outras causas", minutes: otherMinutes });
  const causeGrandTotal = causeTotals.reduce((sum, cause) => sum + cause.minutes, 0);
  const causes = topCauses.map((cause) => ({
    ...cause,
    percentage: causeGrandTotal ? (cause.minutes / causeGrandTotal) * 100 : 0,
  }));
  const affectedEquipment = new Set(
    occurrences
      .filter(({ minutes }) => minutes === null || minutes > 0)
      .map(({ equipment }) => equipment)
      .filter((equipment) => equipment !== "Equipamento não informado" && equipment !== "Linha não informada" && equipment !== "Ativo não informado"),
  ).size;

  return {
    month,
    causeGroupLabel: causeColumn ? "causa" : equipmentColumn ? "equipamento" : lineColumn ? "linha" : "categoria",
    assetLabel: equipmentColumn ? "Equipamentos afetados" : lineColumn ? "Linhas afetadas" : "Ativos afetados",
    assetSingular: equipmentColumn ? "Equipamento" : lineColumn ? "Linha" : "Ativo",
    hasAssets: Boolean(assetColumn),
    hasMinutes: Boolean(minutesColumn),
    occurrences,
    daily,
    causes,
    totalMinutes,
    averageMinutes,
    affectedEquipment,
    recent: occurrences.slice(0, 5),
  };
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `${roundedMinutes.toLocaleString("pt-BR")} min`;
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard-data", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { data?: DashboardData | null; error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os dados.");
        setDashboardData(payload.data ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const summary = useMemo(
    () => dashboardData ? buildSummary(dashboardData) : null,
    [dashboardData],
  );

  return (
    <div className="front-dashboard">
      <SectionHeader
        title="Painel de Manutenção"
        subtitle="Uma visão completa da sua operação. Tudo em um só lugar."
        action={<>
          {summary && <span className="front-period"><ShellIcon name="calendar" />{summary.month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>}
          <Link href="/inserirdados" className="front-button front-button-primary"><ShellIcon name="upload" />Inserir dados</Link>
        </>}
      />
      <div className="front-dashboard-status">
        <span>Histórico de manutenção <span className="front-status-badge">Unidade Marília</span></span>
        <span>{summary ? "Último mês com registros" : "Dados da operação"}</span>
      </div>

      {isLoading ? (
        <div className="front-dashboard-state" role="status"><ShellIcon name="activity" /><h2>Carregando a operação</h2><p>Buscando os indicadores de manutenção...</p></div>
      ) : loadError ? (
        <div className="front-dashboard-state front-dashboard-error" role="alert">
          <ShellIcon name="help" /><h2>Não foi possível carregar os indicadores</h2><p>{loadError}</p>
          <Link href="/tabelas" className="front-button front-button-secondary">Consultar dados</Link>
        </div>
      ) : !dashboardData || !dashboardData.rows.length ? (
        <div className="front-dashboard-state">
          <ShellIcon name="upload" />
          <h2>Sem dados de operação</h2>
          <p>Importe uma planilha para acompanhar falhas, tempos de parada e equipamentos afetados.</p>
          <Link href="/inserirdados" className="front-button front-button-primary">Importar planilha</Link>
        </div>
      ) : !summary ? (
        <div className="front-dashboard-state">
          <ShellIcon name="calendar" />
          <h2>Não foi possível identificar as datas</h2>
          <p>Confira se a planilha contém uma coluna de data reconhecível para gerar os indicadores mensais.</p>
          <Link href="/tabelas" className="front-button front-button-secondary">Conferir registros</Link>
        </div>
      ) : (
        <DashboardContent summary={summary} />
      )}
      {!isLoading && !summary && <DashboardWithoutIndicators />}
    </div>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const metrics: { title: string; value: string; detail: string; icon: ShellIconName }[] = [
    { title: "Ocorrências no mês", value: summary.occurrences.length.toLocaleString("pt-BR"), detail: "registros no período", icon: "activity" },
    { title: "Tempo parado", value: summary.hasMinutes ? formatMinutes(summary.totalMinutes) : "—", detail: summary.hasMinutes ? "total registrado" : "coluna de tempo não identificada", icon: "clock" },
    { title: "Tempo médio por ocorrência", value: summary.hasMinutes ? formatMinutes(summary.averageMinutes) : "—", detail: summary.hasMinutes ? "média no mês" : "coluna de tempo não identificada", icon: "analysis" },
    { title: summary.assetLabel, value: summary.hasAssets ? summary.affectedEquipment.toLocaleString("pt-BR") : "—", detail: summary.hasAssets ? "com registros no mês" : "coluna de ativo não identificada", icon: "machine" },
  ];
  return (
    <>
      <section className="front-kpis" aria-label="Indicadores do mês">
        {metrics.map((metric) => <Kpi key={metric.title} {...metric} />)}
      </section>
      <div className="front-dashboard-charts">
        <section className="front-panel front-daily-panel" aria-labelledby="daily-failures-title">
          <div className="front-card-header">
            <div><h2 id="daily-failures-title">Falhas por dia</h2><p>Últimos 7 dias até o registro mais recente</p></div>
            <Link href="/pareto" className="shell-icon-button" aria-label="Ver análise de falhas"><ShellIcon name="external" /></Link>
          </div>
          <div className="front-chart-legend"><span /> Ocorrências registradas</div>
          <div className="front-daily-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.daily} margin={{ top: 15, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f3" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#42454e", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#42454e", fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e8eaee", fontSize: 12 }} cursor={{ fill: "#f8f8fa" }} formatter={(value) => [Number(value).toLocaleString("pt-BR"), "Ocorrências"]} />
                <Bar isAnimationActive={false} dataKey="count" name="Ocorrências" fill="#da291c" radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="front-chart-footnote">{summary.occurrences.length.toLocaleString("pt-BR")} ocorrências no mês.</p>
          <details className="front-chart-details">
            <summary>Ver dados por dia</summary>
            <table><caption>Ocorrências nos últimos 7 dias</caption><thead><tr><th>Dia</th><th>Ocorrências</th></tr></thead><tbody>{summary.daily.map((day) => <tr key={day.label}><td>{day.label}</td><td>{day.count.toLocaleString("pt-BR")}</td></tr>)}</tbody></table>
          </details>
        </section>
        <section className="front-panel" aria-labelledby="cause-distribution-title">
          <div className="front-card-header"><div><h2 id="cause-distribution-title">Tempo parado por {summary.causeGroupLabel}</h2><p>Distribuição das paradas no mês</p></div></div>
          {summary.causes.length ? (
            <>
              <div className="front-cause-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={summary.causes} dataKey="minutes" nameKey="name" innerRadius="68%" outerRadius="85%" paddingAngle={3} stroke="#fff" strokeWidth={2}>
                      {summary.causes.map((cause, index) => <Cell key={cause.name} fill={causeColors[index % causeColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e8eaee", fontSize: 12 }} formatter={(value) => [formatMinutes(Number(value)), "Tempo parado"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="front-donut-center" aria-hidden="true"><strong>{formatMinutes(summary.totalMinutes)}</strong><span>no mês</span></div>
              </div>
              <div className="front-distribution-summary"><span>Tempo registrado</span><strong>{formatMinutes(summary.totalMinutes)}</strong></div>
            </>
          ) : <p className="front-chart-empty">Sem tempos registrados para comparar as causas.</p>}
        </section>
        <section className="front-panel" aria-labelledby="causes-ranking-title">
          <div className="front-card-header"><div><h2 id="causes-ranking-title">{summary.causeGroupLabel === "causa" ? "Principais causas" : summary.causeGroupLabel === "equipamento" ? "Paradas por equipamento" : summary.causeGroupLabel === "linha" ? "Paradas por linha" : "Categorias de parada"}</h2><p>Participação no tempo total do mês</p></div></div>
          {summary.causes.length ? <ol className="front-cause-list">{summary.causes.map((cause, index) => <li key={cause.name}><div><span title={cause.name}>{cause.name}</span><strong>{cause.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</strong></div><div className="front-cause-track"><span style={{ width: `${cause.percentage}%`, backgroundColor: causeColors[index % causeColors.length] }} /></div><small>{formatMinutes(cause.minutes)} registrados</small></li>)}</ol> : <p className="front-chart-empty">Importe tempos de parada para ver a distribuição por causa.</p>}
        </section>
      </div>
      <section className="front-panel front-recent-panel" aria-labelledby="recent-occurrences-title">
        <div className="front-card-header"><div><h2 id="recent-occurrences-title">Ocorrências recentes</h2><p>Acompanhe os últimos registros de manutenção</p></div><Link href="/tabelas" className="front-text-link">Ver registros <span aria-hidden="true">→</span></Link></div>
        {summary.recent.length ? <div className="front-table-scroll"><table className="front-events-table"><thead><tr><th>Data</th><th>{summary.assetSingular}</th><th>Causa registrada</th><th>Tempo parado</th></tr></thead><tbody>{summary.recent.map((occurrence, index) => <tr key={`${occurrence.date.toISOString()}-${occurrence.equipment}-${index}`}><td><strong>{formatDate(occurrence.date)}</strong><span>{formatTime(occurrence.date)}</span></td><td>{occurrence.equipment}</td><td>{occurrence.cause}</td><td>{formatMinutes(occurrence.minutes)}</td></tr>)}</tbody></table></div> : <p className="front-chart-empty">Nenhuma ocorrência registrada neste mês.</p>}
      </section>
      <p className="front-dashboard-note">O painel resume o mês mais recente presente nos registros importados. O tempo médio considera apenas linhas com duração numérica informada.</p>
    </>
  );
}

function DashboardWithoutIndicators() {
  return (
    <div className="front-dashboard-unavailable">
      <section className="front-kpis" aria-label="Indicadores indisponíveis">
        <Kpi title="Ocorrências no mês" value="—" detail="Sem dados disponíveis" icon="activity" />
        <Kpi title="Tempo parado" value="—" detail="Sem dados disponíveis" icon="clock" />
        <Kpi title="Tempo médio por ocorrência" value="—" detail="Sem dados disponíveis" icon="analysis" />
        <Kpi title="Ativos afetados" value="—" detail="Sem dados disponíveis" icon="machine" />
      </section>
      <div className="front-dashboard-charts">
        {["Falhas por dia", "Tempo parado por causa", "Principais causas"].map((title) => (
          <section className="front-panel" key={title} aria-label={title}>
            <div className="front-card-header"><div><h2>{title}</h2><p>Histórico de manutenção</p></div></div>
            <p className="front-chart-empty">Nenhum indicador disponível para exibir.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
