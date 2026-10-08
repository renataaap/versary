"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StopRecord = {
  cause: string;
  minutes: string;
  line: string;
  occurredAt: string;
};

type DetailPayload = {
  records?: StopRecord[];
  error?: string;
};

type CauseSummary = {
  name: string;
  occurrences: number;
  minutes: number;
};

const chartColors = ["#8f1820", "#c9232b", "#d45d61", "#d6928d", "#e7aaa2", "#806d68"];

function parseMinutes(value: string): number | null {
  const text = value.trim().replace(/\s/g, "");
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const minutes = Number(normalized);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function parseDate(value: string): Date | null {
  const text = value.trim();
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

function formatMinutes(value: number | null) {
  return value === null
    ? "Sem dados"
    : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
}

function loadSvgImage(source: SVGSVGElement): Promise<HTMLImageElement> {
  const bounds = source.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  if (!width || !height) {
    return Promise.reject(new Error("Um dos gráficos ainda não está pronto para exportação."));
  }

  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("font-family", "Arial, sans-serif");

  const imageUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }),
  );

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Não foi possível preparar um gráfico para exportação."));
    };
    image.src = imageUrl;
  });
}

function summarizeRecords(records: StopRecord[]) {
  const causes = new Map<string, CauseSummary>();
  const lines = new Map<string, number>();
  const datedRecords: Date[] = [];
  let totalMinutes = 0;
  let recordsWithMinutes = 0;

  for (const record of records) {
    const causeName = record.cause || "Causa não informada";
    const cause = causes.get(causeName) ?? { name: causeName, occurrences: 0, minutes: 0 };
    cause.occurrences += 1;
    const minutes = parseMinutes(record.minutes);
    if (minutes !== null) {
      cause.minutes += minutes;
      totalMinutes += minutes;
      recordsWithMinutes += 1;
    }
    causes.set(causeName, cause);

    const line = record.line || "Linha não informada";
    lines.set(line, (lines.get(line) ?? 0) + 1);

    const date = parseDate(record.occurredAt);
    if (date) datedRecords.push(date);
  }

  const causeSummaries = Array.from(causes.values())
    .sort((first, second) => second.occurrences - first.occurrences || second.minutes - first.minutes);
  const lineSummaries = Array.from(lines, ([name, occurrences]) => ({ name, occurrences }))
    .sort((first, second) => second.occurrences - first.occurrences);
  const dateBounds = datedRecords.reduce(
    (bounds, date) => ({
      earliest: Math.min(bounds.earliest, date.getTime()),
      latest: Math.max(bounds.latest, date.getTime()),
    }),
    { earliest: Number.POSITIVE_INFINITY, latest: Number.NEGATIVE_INFINITY },
  );
  const dateRange = datedRecords.length ? dateBounds.latest - dateBounds.earliest : 0;
  const useMonthlyTrend = dateRange > 90 * 86400000;
  const trendCounts = new Map<string, number>();

  for (const date of datedRecords) {
    const key = useMonthlyTrend
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    trendCounts.set(key, (trendCounts.get(key) ?? 0) + 1);
  }

  const trend = Array.from(trendCounts, ([key, occurrences]) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day ?? 1);
    return {
      label: useMonthlyTrend
        ? date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      occurrences,
      sortKey: key,
    };
  }).sort((first, second) => first.sortKey.localeCompare(second.sortKey));

  const hasMinutes = recordsWithMinutes > 0;
  const sortedParetoSource = causeSummaries
    .map((cause) => ({ ...cause, value: hasMinutes ? cause.minutes : cause.occurrences }))
    .sort((first, second) => second.value - first.value);
  const paretoSource = sortedParetoSource.length > 12
    ? [
      ...sortedParetoSource.slice(0, 11),
      sortedParetoSource.slice(11).reduce(
        (other, cause) => ({
          name: "Outras causas",
          occurrences: other.occurrences + cause.occurrences,
          minutes: other.minutes + cause.minutes,
          value: other.value + cause.value,
        }),
        { name: "Outras causas", occurrences: 0, minutes: 0, value: 0 },
      ),
    ]
    : sortedParetoSource;
  const paretoTotal = paretoSource.reduce((sum, cause) => sum + cause.value, 0);
  let accumulated = 0;
  const pareto = paretoSource.map((cause) => {
    accumulated += cause.value;
    return {
      ...cause,
      accumulated: paretoTotal ? (accumulated / paretoTotal) * 100 : 0,
    };
  });

  const pieSource = causeSummaries
    .filter((cause) => cause.minutes > 0)
    .sort((first, second) => second.minutes - first.minutes);
  const pieData = pieSource.slice(0, 5).map((cause) => ({ name: cause.name, value: cause.minutes }));
  const otherMinutes = pieSource.slice(5).reduce((sum, cause) => sum + cause.minutes, 0);
  if (otherMinutes > 0) pieData.push({ name: "Outras causas", value: otherMinutes });

  return {
    causeSummaries,
    lineSummaries,
    trend,
    pieData,
    pareto,
    totalMinutes: hasMinutes ? totalMinutes : null,
    mttr: recordsWithMinutes ? totalMinutes / recordsWithMinutes : null,
    mostFrequentCause: causeSummaries[0] ?? null,
    mostFrequentLine: lineSummaries[0] ?? null,
    paretoMetric: hasMinutes ? "Tempo parado (min)" : "Ocorrências",
  };
}

export default function MachineDetailsPage({
  params,
}: {
  params: Promise<{ machine: string }>;
}) {
  const { machine } = use(params);
  let machineName = machine;
  try {
    machineName = decodeURIComponent(machine);
  } catch {
    // Preserve a literal percent sign when the name is already decoded.
  }
  return <MachineAnalytics key={machineName} machineName={machineName} />;
}

function MachineAnalytics({ machineName }: { machineName: string }) {
  const [records, setRecords] = useState<StopRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const chartsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      try {
        const response = await fetch(`/api/maquinas/${encodeURIComponent(machineName)}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as DetailPayload;
        if (!response.ok) {
          throw new Error(payload.error || "Não foi possível carregar os detalhes da máquina.");
        }
        if (!Array.isArray(payload.records)) {
          throw new Error("A resposta dos detalhes da máquina está inválida.");
        }
        setRecords(payload.records);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os detalhes da máquina.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadDetails();
    return () => controller.abort();
  }, [machineName]);

  const summary = useMemo(() => summarizeRecords(records), [records]);
  const barData = summary.causeSummaries.slice(0, 10);
  const paretoData = summary.pareto.slice(0, 12);

  async function exportCharts() {
    setIsExporting(true);
    setExportError("");

    try {
      const chartSvgs = Array.from(
        chartsRef.current?.querySelectorAll<SVGSVGElement>(".machine-detail-chart svg.recharts-surface") ?? [],
      );
      if (!chartSvgs.length) {
        throw new Error("Nenhum gráfico está disponível para exportação.");
      }

      const images = await Promise.all(chartSvgs.map(loadSvgImage));
      const columns = 2;
      const rows = Math.ceil(images.length / columns);
      const cellWidth = 960;
      const cellHeight = 440;
      const gap = 24;
      const canvas = document.createElement("canvas");
      canvas.width = columns * cellWidth + (columns + 1) * gap;
      canvas.height = rows * cellHeight + (rows + 1) * gap;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("O navegador não conseguiu preparar a imagem JPEG.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      images.forEach((image, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = gap + column * (cellWidth + gap) + (cellWidth - width) / 2;
        const y = gap + row * (cellHeight + gap) + (cellHeight - height) / 2;
        context.drawImage(image, x, y, width, height);
      });

      const jpeg = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Não foi possível gerar o arquivo JPEG."));
          },
          "image/jpeg",
          0.92,
        );
      });
      const downloadUrl = URL.createObjectURL(jpeg);
      const safeName = machineName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "maquina";
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `graficos-${safeName}.jpeg`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (exportFailure) {
      setExportError(exportFailure instanceof Error
        ? exportFailure.message
        : "Não foi possível exportar os gráficos.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="dashboard-page dashboard-with-brand-bg analysis-dashboard-page machine-detail-page">
      <header className="page-header machine-detail-header">
        <div>
          <p className="eyebrow">ANÁLISE DA MÁQUINA</p>
          <h1>{machineName}</h1>
          <p className="page-subtitle">Causas, tempos de parada e desempenho por linha.</p>
        </div>
        <div className="machine-detail-actions">
          <button
            type="button"
            className="button button-primary machine-export-button"
            onClick={exportCharts}
            disabled={isLoading || Boolean(error) || records.length === 0 || isExporting}
          >
            {isExporting ? "Exportando..." : "Exportar dados"}
          </button>
          <Link href="/maquinas" className="button button-secondary">← Voltar às máquinas</Link>
        </div>
      </header>

      {exportError && <p className="machine-detail-message machine-detail-error" role="alert">{exportError}</p>}
      {isLoading && <p className="machine-detail-message">Carregando indicadores e gráficos...</p>}
      {error && <p className="machine-detail-message machine-detail-error" role="alert">{error}</p>}

      {!isLoading && !error && !records.length && (
        <p className="machine-detail-message">Não há ocorrências registradas para esta máquina.</p>
      )}

      {!isLoading && !error && records.length > 0 && (
        <>
          <section className="ops-metrics machine-detail-metrics" aria-label="Indicadores da máquina">
            <article className="ops-metric-card">
              <p>Ocorrências de parada</p>
              <strong>{records.length.toLocaleString("pt-BR")}</strong>
              <span>Total de registros encontrados</span>
            </article>
            <article className="ops-metric-card ops-metric-brown">
              <p>Tempo total parado</p>
              <strong>{formatMinutes(summary.totalMinutes)}</strong>
              <span>Soma dos tempos registrados</span>
            </article>
            <article className="ops-metric-card ops-metric-orange">
              <p>MTTR médio</p>
              <strong>{formatMinutes(summary.mttr)}</strong>
              <span>Tempo registrado ÷ ocorrências com duração</span>
            </article>
            <article className="ops-metric-card ops-metric-pink">
              <p>Linha com mais erros</p>
              <strong>{summary.mostFrequentLine?.name ?? "Sem dados"}</strong>
              <span>{summary.mostFrequentLine
                ? `${summary.mostFrequentLine.occurrences.toLocaleString("pt-BR")} ocorrência(s)`
                : "Nenhuma linha identificada"}</span>
            </article>
            <article className="ops-metric-card ops-metric-brown">
              <p>Causa mais recorrente</p>
              <strong>{summary.mostFrequentCause?.name ?? "Sem dados"}</strong>
              <span>{summary.mostFrequentCause
                ? `${summary.mostFrequentCause.occurrences.toLocaleString("pt-BR")} ocorrência(s)`
                : "Nenhuma causa identificada"}</span>
            </article>
          </section>

          <section
            className="machine-detail-charts"
            aria-label="Gráficos de análise da máquina"
            ref={chartsRef}
          >
            <article className="ops-panel machine-detail-chart-panel">
              <div className="ops-panel-heading">
                <div>
                  <p className="ops-panel-kicker">FREQUÊNCIA</p>
                  <h2>Ocorrências por causa</h2>
                </div>
                <span className="ops-panel-total">Top 10</span>
              </div>
              {barData.length ? (
                <div className="machine-detail-chart machine-detail-bar-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 12, right: 12, left: 0, bottom: 58 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} height={78} tick={{ fill: "#806d68", fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#806d68", fontSize: 11 }} />
                      <Tooltip />
                      <Bar isAnimationActive={false} dataKey="occurrences" name="Ocorrências" fill="#8f1820" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="ops-chart-empty">Não há causas de parada registradas.</p>}
            </article>

            <article className="ops-panel machine-detail-chart-panel">
              <div className="ops-panel-heading">
                <div>
                  <p className="ops-panel-kicker">TEMPO PARADO</p>
                  <h2>Distribuição por causa</h2>
                </div>
              </div>
              {summary.pieData.length ? (
                <div className="machine-detail-chart machine-detail-pie-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie isAnimationActive={false} data={summary.pieData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={3}>
                        {summary.pieData.map((item, index) => (
                          <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatMinutes(Number(value)), "Tempo parado"]} />
                      <Legend verticalAlign="bottom" height={48} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="ops-chart-empty">Não há tempos de parada válidos para montar a distribuição.</p>}
            </article>

            <article className="ops-panel machine-detail-chart-panel">
              <div className="ops-panel-heading">
                <div>
                  <p className="ops-panel-kicker">EVOLUÇÃO</p>
                  <h2>Paradas ao longo do tempo</h2>
                </div>
                <span className="ops-panel-total">{summary.trend.length ? "Por data" : "Sem datas"}</span>
              </div>
              {summary.trend.length ? (
                <div className="machine-detail-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary.trend} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#806d68", fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#806d68", fontSize: 11 }} />
                      <Tooltip />
                      <Line isAnimationActive={false} dataKey="occurrences" name="Ocorrências" type="monotone" stroke="#c9232b" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="ops-chart-empty">Não há datas válidas nos registros para mostrar a evolução.</p>}
            </article>

            <article className="ops-panel machine-detail-chart-panel">
              <div className="ops-panel-heading">
                <div>
                  <p className="ops-panel-kicker">PRIORIZAÇÃO</p>
                  <h2>Pareto de causas</h2>
                </div>
                <span className="ops-panel-total">Acumulado (%)</span>
              </div>
              {paretoData.length ? (
                <div className="machine-detail-chart machine-detail-bar-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData} margin={{ top: 12, right: 12, left: 0, bottom: 58 }}>
                      <CartesianGrid stroke="#eadbd7" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} height={78} tick={{ fill: "#806d68", fontSize: 10 }} />
                      <YAxis yAxisId="value" tick={{ fill: "#806d68", fontSize: 11 }} />
                      <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#c9232b", fontSize: 10 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={30} />
                      <Bar isAnimationActive={false} yAxisId="value" dataKey="value" name={summary.paretoMetric} fill="#8f1820" radius={[3, 3, 0, 0]} />
                      <Line isAnimationActive={false} yAxisId="percent" dataKey="accumulated" name="% acumulado" type="monotone" stroke="#c9232b" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="ops-chart-empty">Não há dados suficientes para montar o Pareto.</p>}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
