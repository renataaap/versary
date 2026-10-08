"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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

type PeriodFilter = "month" | "week" | "day";

const columnByPattern = (columns: string[], pattern: RegExp) =>
  columns.find((column) => pattern.test(column.toLowerCase()));

function parseDate(value: unknown) {
  const date = new Date(String(value ?? "").replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLogDomain(values: number[]) {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!positive.length) return [0.1, 10] as [number, number];

  const minPower = Math.floor(Math.log10(Math.min(...positive)));
  const maxPower = Math.ceil(Math.log10(Math.max(...positive)));
  if (minPower === maxPower) return [10 ** (minPower - 1), 10 ** (maxPower + 1)] as [number, number];
  return [10 ** minPower, 10 ** maxPower] as [number, number];
}

function buildJackKnifeData(data: DashboardData, period: PeriodFilter, selectedLine: string) {
  const lineColumn = columnByPattern(data.columns, /linha|line/);
  const equipmentColumn = columnByPattern(data.columns, /chave.*parada|equipamento|equipment|descripcion.*equipo/);
  const failureColumn = columnByPattern(data.columns, /observa|subchave|chave_1|tipo.*parada|failure|cause/);
  const minutesColumn = columnByPattern(data.columns, /minuto.*parada|total.*minuto|tempo|minute|duration/);
  const dateColumn = columnByPattern(data.columns, /data|date|inicio/);

  if (!lineColumn || !equipmentColumn || !failureColumn || !minutesColumn || !dateColumn) {
    return { points: [], frequencyLimit: 0, mttrLimit: 0, domainX: [0.1, 10] as [number, number], domainY: [0.1, 10] as [number, number] };
  }

  const dates = data.rows.map((row) => parseDate(row[dateColumn])).filter((date): date is Date => date !== null);
  const latestDate = dates.reduce((latest, current) => current > latest ? current : latest, dates[0]);
  const days = period === "month" ? 30 : period === "week" ? 7 : 1;
  const fromDate = latestDate ? new Date(latestDate.getTime() - (days - 1) * 86400000) : null;
  const periodRows = data.rows.filter((row) => {
    const date = parseDate(row[dateColumn]);
    return date && (!fromDate || date >= fromDate);
  });
  const lineExistsInPeriod = selectedLine === "all"
    || periodRows.some((row) => String(row[lineColumn] ?? "").trim() === selectedLine);
  const rowsToAnalyze = periodRows.length && lineExistsInPeriod ? periodRows : data.rows;

  const grouped = new Map<string, { equipment: string; failure: string; frequency: number; totalMinutes: number; machines: Set<string> }>();
  rowsToAnalyze.forEach((row) => {
    const line = String(row[lineColumn] ?? "").trim();
    const equipment = String(row[equipmentColumn] ?? "").trim();
    const failure = String(row[failureColumn] ?? "").trim();
    const minutes = Number(String(row[minutesColumn] ?? "").replace(",", "."));
    if (!line || !equipment || !failure || !Number.isFinite(minutes) || minutes <= 0) return;
    if (selectedLine !== "all" && line !== selectedLine) return;

    const groupLabel = `${equipment} — ${failure}`;
    const machineId = `${line} — ${equipment}`;
    const current = grouped.get(groupLabel) || { equipment, failure, frequency: 0, totalMinutes: 0, machines: new Set<string>() };
    current.machines.add(machineId);
    grouped.set(groupLabel, {
      ...current,
      frequency: current.frequency + 1,
      totalMinutes: current.totalMinutes + minutes,
    });
  });

  const groups = Array.from(grouped.values())
    .map((group) => ({ ...group, machineCount: group.machines.size, mttr: group.totalMinutes / group.machines.size }))
    .filter((group) => group.frequency > 0 && group.mttr > 0);
  const frequencyLimit = groups.length ? groups.reduce((sum, point) => sum + point.frequency, 0) / groups.length : 0;
  const mttrLimit = groups.length ? groups.reduce((sum, point) => sum + point.mttr, 0) / groups.length : 0;
  const points = groups
    .sort((first, second) => second.frequency - first.frequency)
    .map((group, index) => ({
      ...group,
      index: index + 1,
      name: `${group.equipment} — ${group.failure}`,
      category: group.mttr >= mttrLimit
        ? group.frequency >= frequencyLimit ? "Crítico-crônico" : "Crítico"
        : group.frequency >= frequencyLimit ? "Crônico" : "Conforto",
    }));

  return {
    points,
    frequencyLimit,
    mttrLimit,
    domainX: getLogDomain([...points.map((point) => point.frequency), frequencyLimit]),
    domainY: getLogDomain([...points.map((point) => point.mttr), mttrLimit]),
  };
}

export default function JackKnifePage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [selectedLine, setSelectedLine] = useState("all");

  useEffect(() => {
    fetch("/api/dashboard-data")
      .then(async (response) => {
        const payload = await response.json() as { data?: DashboardData | null; error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os dados.");
        setDashboardData(payload.data || null);
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados."));
  }, []);

  const lineOptions = useMemo(() => {
    if (!dashboardData) return [];
    const lineColumn = columnByPattern(dashboardData.columns, /linha|line/);
    if (!lineColumn) return [];
    return Array.from(new Set(dashboardData.rows.map((row) => String(row[lineColumn] ?? "").trim()).filter(Boolean))).sort();
  }, [dashboardData]);

  const chart = useMemo(
    () => dashboardData
      ? buildJackKnifeData(dashboardData, period, selectedLine)
      : { points: [], frequencyLimit: 0, mttrLimit: 0, domainX: [0.1, 10] as [number, number], domainY: [0.1, 10] as [number, number] },
    [dashboardData, period, selectedLine],
  );

  const categoryColors: Record<string, string> = {
    "Crítico-crônico": "#c9232b",
    Crítico: "#8f1820",
    Crônico: "#d6928d",
    Conforto: "#806d68",
  };
  const criticalCount = chart.points.filter((point) => point.category === "Crítico-crônico").length;

  if (!chart.points.length) {
    return <EmptyDashboardPage message={loadError || "Insira uma planilha com colunas de linha, equipamento, descrição da falha, data e minutos parados para visualizar o Jack–Knife."} />;
  }

  return (
    <div className="dashboard-page dashboard-with-brand-bg analysis-dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1>Análises</h1>
          <p className="page-subtitle">Criticidade e cronicidade por equipamento/falha</p>
        </div>
        <Link href="/inserirdados" className="button button-primary">Inserir dados</Link>
      </header>

      <section className="dashboard-chart-card pareto-card jackknife-card" aria-labelledby="jackknife-title">
        <AnalysisTabs active="jackknife" />
        <div className="analysis-filters" aria-label="Filtros da análise">
          <label>Período:
            <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
              <option value="month">Mês</option>
              <option value="week">Semana</option>
              <option value="day">Dia</option>
            </select>
          </label>
          <label>Setor:
            <select value={selectedLine} onChange={(event) => setSelectedLine(event.target.value)}>
              <option value="all">Todas as linhas</option>
              {lineOptions.map((line) => <option key={line} value={line}>{line}</option>)}
            </select>
          </label>
          <span>Analisar por: <strong>{selectedLine === "all" ? "Equipamento/falha" : selectedLine}</strong></span>
        </div>

        <div className="chart-heading jackknife-chart-heading">
          <div>
            <p className="empty-state-kicker">ANÁLISE DE FALHAS</p>
            <h2 id="jackknife-title">Crítico-crônico</h2>
            <p className="jackknife-chart-title">CRÍTICO- CRÔNICO LINHA &amp; EQUIPAMENTO</p>
          </div>
        </div>

        {chart.points.length ? (
          <>
            <div className="jackknife-layout">
              <div className="jackknife-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 28, right: 24, bottom: 42, left: 24 }}>
                    <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      dataKey="frequency"
                      name="Nº de falhas"
                      scale="log"
                      domain={chart.domainX}
                      allowDataOverflow
                      tick={{ fill: "#806d68", fontSize: 11 }}
                      label={{ value: "Nº de falhas (cronicidade) — escala logarítmica", position: "insideBottom", offset: -22, fill: "#806d68", fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="mttr"
                      name="MTTR"
                      scale="log"
                      domain={chart.domainY}
                      allowDataOverflow
                      tick={{ fill: "#806d68", fontSize: 11 }}
                      tickFormatter={(value) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                      label={{ value: "MTTR", angle: -90, position: "insideLeft", offset: -10, fill: "#806d68", fontSize: 13, fontWeight: 700 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        const point = payload?.[0]?.payload;
                        if (!active || !point) return null;

                        return (
                          <div className="pareto-tooltip">
                            <strong>{point.equipment}</strong>
                            <span><b>Tempo:</b> {Number(point.totalMinutes).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min</span>
                            <span><b>Falhas:</b> {Number(point.frequency).toLocaleString("pt-BR")}</span>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={chart.frequencyLimit} stroke="#c9232b" strokeWidth={1.5} label={{ value: `Limite frequência: ${chart.frequencyLimit.toFixed(1)}`, position: "insideTopRight", fill: "#8f1820", fontSize: 10 }} />
                    <ReferenceLine y={chart.mttrLimit} stroke="#8f1820" strokeWidth={1.5} label={{ value: `Limite criticidade: ${chart.mttrLimit.toFixed(1)} min`, position: "insideTopLeft", fill: "#8f1820", fontSize: 10 }} />
                    {Object.entries(categoryColors).map(([category, fill]) => (
                      <Scatter isAnimationActive={false}
                        key={category}
                        name={category}
                        data={chart.points.filter((point) => point.category === category)}
                        fill={fill}
                        shape="circle"
                      >
                        <LabelList dataKey="index" position="top" fill="#281815" fontSize={10} />
                      </Scatter>
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <aside className="pareto-side-panel jackknife-side-panel">
              <div className="pareto-insight">
                <p>INSIGHT</p>
                <strong>{criticalCount} grupo(s) crítico-crônicos</strong>
                <span>Priorize os equipamentos acima dos limites de frequência e MTTR.</span>
              </div>
              <div className="pareto-table-wrap jackknife-table-wrap">
                <table className="pareto-table jackknife-table">
                  <thead><tr><th>Equipamento/falha</th><th>T (min)</th><th>Máq.</th><th>Q</th><th>MTTR</th><th>Categoria</th></tr></thead>
                  <tbody>{chart.points.map((point) => (
                    <tr key={point.name}>
                      <td title={point.name}><span className="jackknife-point-id">{point.index}</span>{point.name}</td>
                      <td>{point.totalMinutes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                      <td>{point.machineCount}</td>
                      <td>{point.frequency}</td>
                      <td>{point.mttr.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                      <td><span className="jackknife-category" style={{ color: categoryColors[point.category] }}>{point.category}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </aside>
            <div className="jackknife-formulas">
              <span><strong>Frequência (Q):</strong> ocorrências por equipamento/falha</span>
              <span><strong>MTTR:</strong> soma do tempo parado ÷ máquinas analisadas</span>
              <span><strong>Limites:</strong> média de Q e média de MTTR dos grupos analisados</span>
            </div>
          </>
        ) : (
          <div className="jackknife-empty" role={loadError ? "alert" : "status"}>
            {loadError || "Não há dados de falhas suficientes para montar o gráfico. Importe colunas de linha, equipamento, descrição da falha, data e minutos parados."}
          </div>
        )}
      </section>
    </div>
  );
}
