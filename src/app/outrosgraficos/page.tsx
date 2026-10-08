"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalysisTabs } from "@/components/analysis-tabs";
import { EmptyDashboardPage } from "@/components/empty-dashboard";

type DashboardData = {
  columns: string[];
  rows: Record<string, unknown>[];
};

type ChartType = "criticality" | "projection" | "waterfall";
type Criticality = "Crítico-crônico" | "Crítico" | "Crônico" | "Conforto";

type MonthlyPoint = {
  month: string;
  key: string;
  criticalChronic: number;
  critical: number;
  chronic: number;
  comfort: number;
  actual: number;
  target: number;
};

type WaterfallPoint = {
  name: string;
  label: string;
  base: number;
  value: number;
  total: boolean;
};

type GraphData = {
  monthly: MonthlyPoint[];
  waterfall: WaterfallPoint[];
  totalMinutes: number;
  target: number;
  targetAverage: number;
  criticalChronicGroups: number;
  topCauseShare: number;
};

type FailureRecord = {
  date: Date;
  monthKey: string;
  machine: string;
  equipment: string;
  failure: string;
  minutes: number;
};

const categoryColors: Record<Criticality, string> = {
  "Crítico-crônico": "#c9232b",
  Crítico: "#8f1820",
  Crônico: "#d6928d",
  Conforto: "#806d68",
};

const chartOptions: { value: ChartType; label: string }[] = [
  { value: "criticality", label: "Barras empilhadas por criticidade" },
  { value: "projection", label: "Resultado e meta de projeção" },
  { value: "waterfall", label: "Cascata de paradas" },
];

const columnByPattern = (columns: string[], pattern: RegExp) =>
  columns.find((column) => pattern.test(column.toLowerCase()));

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = brazilianDate
    ? new Date(Number(brazilianDate[3]), Number(brazilianDate[2]) - 1, Number(brazilianDate[1]))
    : new Date(text.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildGraphData(data: DashboardData): GraphData | null {
  const lineColumn = columnByPattern(data.columns, /linha|line/);
  const equipmentColumn = columnByPattern(data.columns, /chave.*parada|equipamento|equipment|descripcion.*equipo/);
  const failureColumn = columnByPattern(data.columns, /observa|subchave|chave_1|tipo.*parada|failure|cause/);
  const minutesColumn = columnByPattern(data.columns, /minuto.*parada|total.*minuto|tempo|minute|duration/);
  const dateColumn = columnByPattern(data.columns, /data|date|inicio/);

  if (!equipmentColumn || !minutesColumn || !dateColumn) return null;

  const datedRecords = data.rows.flatMap((row) => {
    const date = parseDate(row[dateColumn]);
    const minutes = Number(String(row[minutesColumn] ?? "").replace(",", "."));
    const equipment = String(row[equipmentColumn] ?? "").trim();
    if (!date || !equipment || !Number.isFinite(minutes) || minutes <= 0) return [];
    return [{ row, date, minutes, equipment }];
  });
  if (!datedRecords.length) return null;

  const latestDate = datedRecords.reduce((latest, record) => record.date > latest ? record.date : latest, datedRecords[0].date);
  const firstMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() - 11, 1);
  const records: FailureRecord[] = datedRecords
    .filter(({ date }) => date >= firstMonth)
    .map(({ row, date, minutes, equipment }) => {
      const line = String(lineColumn ? row[lineColumn] ?? "" : "").trim();
      const failure = String(failureColumn ? row[failureColumn] ?? "" : "").trim() || equipment;
      return {
        date,
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        machine: `${line || "Sem linha"} — ${equipment}`,
        equipment,
        failure,
        minutes,
      };
    });

  const groups = new Map<string, { frequency: number; totalMinutes: number; machines: Set<string> }>();
  records.forEach((record) => {
    const key = `${record.equipment} — ${record.failure}`;
    const group = groups.get(key) || { frequency: 0, totalMinutes: 0, machines: new Set<string>() };
    group.frequency += 1;
    group.totalMinutes += record.minutes;
    group.machines.add(record.machine);
    groups.set(key, group);
  });

  const groupStats = Array.from(groups, ([name, group]) => ({
    name,
    ...group,
    mttr: group.totalMinutes / group.machines.size,
  }));
  const frequencyLimit = groupStats.reduce((sum, group) => sum + group.frequency, 0) / groupStats.length;
  const mttrLimit = groupStats.reduce((sum, group) => sum + group.mttr, 0) / groupStats.length;
  const groupCategories = new Map<string, Criticality>();
  groupStats.forEach((group) => {
    const category: Criticality = group.mttr >= mttrLimit
      ? group.frequency >= frequencyLimit ? "Crítico-crônico" : "Crítico"
      : group.frequency >= frequencyLimit ? "Crônico" : "Conforto";
    groupCategories.set(group.name, category);
  });

  const monthlyMap = new Map<string, MonthlyPoint>();
  for (let offset = 0; offset < 12; offset += 1) {
    const monthDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, {
      key,
      month: monthDate.toLocaleDateString("pt-BR", { month: "short" }),
      criticalChronic: 0,
      critical: 0,
      chronic: 0,
      comfort: 0,
      actual: 0,
      target: 0,
    });
  }

  records.forEach((record) => {
    const point = monthlyMap.get(record.monthKey);
    if (!point) return;
    const groupName = `${record.equipment} — ${record.failure}`;
    const category = groupCategories.get(groupName);
    if (category === "Crítico-crônico") point.criticalChronic += record.minutes;
    else if (category === "Crítico") point.critical += record.minutes;
    else if (category === "Crônico") point.chronic += record.minutes;
    else point.comfort += record.minutes;
    point.actual += record.minutes;
  });

  const monthly = Array.from(monthlyMap.values());
  const observedMonths = monthly.filter((point) => point.actual > 0);
  const targetAverage = observedMonths.reduce((sum, point) => sum + point.actual, 0) / observedMonths.length;
  const target = targetAverage * 0.9;
  monthly.forEach((point) => { point.target = target; });

  const causeTotals = new Map<string, number>();
  records.forEach((record) => {
    const name = `${record.equipment} — ${record.failure}`;
    causeTotals.set(name, (causeTotals.get(name) || 0) + record.minutes);
  });
  const sortedCauses = Array.from(causeTotals, ([name, minutes]) => ({ name, minutes }))
    .sort((first, second) => second.minutes - first.minutes);
  const visibleCauses = sortedCauses.slice(0, 8).map((cause) => ({ ...cause }));
  const otherMinutes = sortedCauses.slice(8).reduce((sum, cause) => sum + cause.minutes, 0);
  if (otherMinutes > 0) visibleCauses.push({ name: "Outras causas", minutes: otherMinutes });

  let accumulated = 0;
  const waterfall: WaterfallPoint[] = [{ name: "Início", label: "Início", base: 0, value: 0, total: false }];
  visibleCauses.forEach((cause) => {
    waterfall.push({
      name: cause.name,
      label: cause.name.length > 18 ? `${cause.name.slice(0, 17)}…` : cause.name,
      base: accumulated,
      value: cause.minutes,
      total: false,
    });
    accumulated += cause.minutes;
  });
  waterfall.push({ name: "Total de paradas", label: "Total", base: 0, value: accumulated, total: true });

  const totalMinutes = monthly.reduce((sum, point) => sum + point.actual, 0);
  const criticalChronicGroups = groupStats.filter((group) => groupCategories.get(group.name) === "Crítico-crônico").length;
  const topCauseShare = totalMinutes ? (sortedCauses[0]?.minutes || 0) / totalMinutes * 100 : 0;

  return {
    monthly,
    waterfall,
    totalMinutes,
    target,
    targetAverage,
    criticalChronicGroups,
    topCauseShare,
  };
}

function formatMinutes(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
}

export default function OtherChartsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [chartType, setChartType] = useState<ChartType>("criticality");

  useEffect(() => {
    fetch("/api/dashboard-data")
      .then(async (response) => {
        const payload = await response.json() as { data?: DashboardData | null; error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os dados.");
        setDashboardData(payload.data || null);
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados."));
  }, []);

  const graphs = useMemo(() => dashboardData ? buildGraphData(dashboardData) : null, [dashboardData]);
  const selectedOption = chartOptions.find((option) => option.value === chartType) || chartOptions[0];

  if (!graphs?.monthly.some((point) => point.actual > 0)) {
    return <EmptyDashboardPage message={loadError || "Insira uma planilha com colunas de equipamento, data e minutos parados para visualizar os gráficos."} />;
  }

  return (
    <div className="dashboard-page dashboard-with-brand-bg analysis-dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1>Análises</h1>
          <p className="page-subtitle">Indicadores complementares de falhas e manutenção</p>
        </div>
      </header>

      <section className="dashboard-chart-card pareto-card" aria-labelledby="other-charts-title">
        <AnalysisTabs active="other" />
        <div className="analysis-filters" aria-label="Seleção do gráfico">
          <label htmlFor="chart-type">Gráfico:
            <select id="chart-type" value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}>
              {chartOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="chart-heading">
          <div>
            <p className="empty-state-kicker">ANÁLISE DE FALHAS</p>
            <h2 id="other-charts-title">{selectedOption.label}</h2>
            <p>{chartType === "criticality" && "Tempo parado por categoria de criticidade, calculada pelos limites de frequência e MTTR."}
              {chartType === "projection" && "Tempo parado por mês comparado à meta de projeção calculada sobre o histórico."}
              {chartType === "waterfall" && "Contribuição das principais causas para o total de minutos parados."}</p>
          </div>
        </div>

        {graphs?.monthly.length ? (
          <>
            <div className="pareto-layout other-graphs-layout">
              <div className="chart-container pareto-chart-container other-graphs-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "criticality" ? (
                    <BarChart data={graphs.monthly} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#806d68", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#806d68", fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString("pt-BR")} />
                      <Tooltip formatter={(value) => [formatMinutes(Number(value)), "Tempo parado"]} />
                      <Legend />
                      <Bar isAnimationActive={false} dataKey="criticalChronic" name="Crítico-crônico" stackId="criticality" fill={categoryColors["Crítico-crônico"]} />
                      <Bar isAnimationActive={false} dataKey="critical" name="Crítico" stackId="criticality" fill={categoryColors.Crítico} />
                      <Bar isAnimationActive={false} dataKey="chronic" name="Crônico" stackId="criticality" fill={categoryColors.Crônico} />
                      <Bar isAnimationActive={false} dataKey="comfort" name="Conforto" stackId="criticality" fill={categoryColors.Conforto} />
                    </BarChart>
                  ) : chartType === "projection" ? (
                    <ComposedChart data={graphs.monthly} margin={{ top: 18, right: 18, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#806d68", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#806d68", fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString("pt-BR")} />
                      <Tooltip formatter={(value, name) => [formatMinutes(Number(value)), name]} />
                      <Legend />
                      <Bar isAnimationActive={false} dataKey="actual" name="Realizado" fill="#c9232b" />
                      <Line isAnimationActive={false} dataKey="target" name="Meta de projeção (−10%)" type="monotone" stroke="#4b2b25" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", stroke: "#4b2b25", strokeWidth: 2 }} />
                    </ComposedChart>
                  ) : (
                    <BarChart data={graphs.waterfall} margin={{ top: 18, right: 16, left: 0, bottom: 66 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" angle={-24} textAnchor="end" interval={0} height={78} tick={{ fill: "#806d68", fontSize: 9 }} />
                      <YAxis tick={{ fill: "#806d68", fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString("pt-BR")} />
                      <Tooltip
                        formatter={(value, name) => name === "base" ? null : [formatMinutes(Number(value)), "Tempo parado"]}
                        labelFormatter={(_, payload) => payload[0]?.payload?.name || ""}
                      />
                      <Bar dataKey="base" stackId="waterfall" fill="transparent" legendType="none" isAnimationActive={false} />
                      <Bar isAnimationActive={false} dataKey="value" name="Tempo parado" stackId="waterfall">
                        {graphs.waterfall.map((point) => <Cell key={point.name} fill={point.total ? "#8f1820" : "#c9232b"} />)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <aside className="pareto-side-panel">
                <div className="pareto-insight">
                  <p>INSIGHT</p>
                  {chartType === "criticality" && <><strong>{graphs.criticalChronicGroups} grupo(s) crítico-crônicos</strong><span>{formatMinutes(graphs.totalMinutes)} analisados nos últimos 12 meses.</span></>}
                  {chartType === "projection" && <><strong>Meta: {formatMinutes(graphs.target)}</strong><span>10% abaixo da média mensal observada de {formatMinutes(graphs.targetAverage)}.</span></>}
                  {chartType === "waterfall" && <><strong>{graphs.topCauseShare.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% na principal causa</strong><span>O gráfico detalha as causas até o total de {formatMinutes(graphs.totalMinutes)}.</span></>}
                </div>
                <div className="pareto-table-wrap">
                  <table className="pareto-table">
                    <thead><tr><th>Período analisado</th><th>Minutos</th></tr></thead>
                    <tbody>
                      <tr><td>Últimos 12 meses</td><td>{graphs.totalMinutes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td></tr>
                      <tr><td>Meses com registros</td><td>{graphs.monthly.filter((point) => point.actual > 0).length}</td></tr>
                    </tbody>
                  </table>
                </div>
              </aside>
            </div>
            {chartType === "projection" && <div className="pareto-summary"><span>A linha de meta representa uma redução projetada de 10% sobre a média mensal com registros.</span></div>}
          </>
        ) : (
          <div className="jackknife-empty" role={loadError ? "alert" : "status"}>
            {loadError || "Não há dados suficientes. Importe uma planilha com colunas de equipamento, data e minutos parados para visualizar os gráficos."}
          </div>
        )}
      </section>
    </div>
  );
}