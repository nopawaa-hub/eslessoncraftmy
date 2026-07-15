import React from "react";
import { BrainCircuit, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "./ui.jsx";

function AnalysisCard({ title, question, insight, action, className = "", children }) {
  return (
    <article className={`analysis-card ${className}`}>
      <header className="analysis-card-head">
        <div>
          <h3>{title}</h3>
          <p>{question}</p>
        </div>
        <span className="risk-pill low">AI interpreted</span>
      </header>
      <div className="analysis-visual">{children}</div>
      <div className="analysis-narrative">
        <div>
          <strong>What this means</strong>
          <p>{insight}</p>
        </div>
        <div>
          <strong>Suggested intervention</strong>
          <p>{action}</p>
        </div>
      </div>
    </article>
  );
}

function AIAnalysisBlock({ title, context, evidence, action }) {
  return (
    <article className="ai-analysis-block">
      <span><BrainCircuit /> AI teaching analysis</span>
      <h3>{title}</h3>
      <p>{context}</p>
      <div><strong>Evidence</strong><p>{evidence}</p></div>
      <div><strong>Recommended action</strong><p>{action}</p></div>
    </article>
  );
}

function AnalyticsSection({ title, subtitle, children }) {
  return <section className="analytics-layer"><div className="analytics-layer-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="analytics-grid">{children}</div></section>;
}

function MiniChartCard({ title, value, note, className = "", children }) {
  return <article className={`mini-chart-card ${className}`}><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div>{children}</article>;
}

function buildChartPoints(values, max, width = 280, height = 120, padX = 16, padY = 14) {
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values.map((value, index) => ({
    x: padX + (index / Math.max(1, values.length - 1)) * innerW,
    y: padY + innerH - (value / max) * innerH,
    value,
  }));
}

function ChartGrid({ width, height, padX = 16, padY = 14, rows = 3 }) {
  const innerH = height - padY * 2;
  return (
    <>
      {Array.from({ length: rows }, (_, index) => {
        const y = padY + (innerH / rows) * index;
        return <line key={index} x1={padX} y1={y} x2={width - padX} y2={y} className="chart-grid-line" />;
      })}
      {/* Solid X-Axis Baseline */}
      <line x1={padX} y1={padY + innerH} x2={width - padX} y2={padY + innerH} stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Solid Y-Axis Baseline */}
      <line x1={padX} y1={padY} x2={padX} y2={padY + innerH} stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function MiniLineChart({ values, max = 100, tone = "primary" }) {
  const width = 280;
  const height = 100;
  const points = buildChartPoints(values, max, width, height);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className={`chart-frame mini tone-${tone}`}>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height} />
        <polyline points={polyline} className="chart-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.5" className="chart-dot" />)}
      </svg>
    </div>
  );
}

function AreaChart({ values, max = 100, tone = "primary" }) {
  const width = 280;
  const height = 120;
  const points = buildChartPoints(values, max, width, height);
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const baseline = height - 14;
  const area = `${points[0].x},${baseline} ${polyline} ${points[points.length - 1].x},${baseline}`;
  return (
    <div className={`chart-frame area tone-${tone}`}>
      <svg className="chart-svg area" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height} />
        <polygon points={area} className="chart-area-fill" />
        <polyline points={polyline} className="chart-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="2.5" className="chart-dot" />)}
      </svg>
    </div>
  );
}

function MultiLineChart({ series, max = 100, xLabels = [] }) {
  const width = 320;
  const height = 180;
  const padX = 28;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 18;
  const labels = xLabels.length ? xLabels : series[0]?.values.map((_, index) => `W${index + 1}`) || [];
  return (
    <div className="chart-panel">
      <svg className="multi-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <ChartGrid width={width} height={height - 18} padX={padX} padY={padY} />
        {series.map((item, seriesIndex) => {
          const points = item.values.map((value, index) => {
            const x = padX + (index / Math.max(1, item.values.length - 1)) * innerW;
            const y = padY + innerH - (value / max) * innerH;
            return { x, y, value };
          });
          const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
          return (
            <g key={item.label}>
              <polyline points={polyline} className={`line-${seriesIndex}`} />
              {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" className={`chart-dot line-${seriesIndex}`} />)}
            </g>
          );
        })}
        {labels.map((label, index) => {
          const x = padX + (index / Math.max(1, labels.length - 1)) * innerW;
          return <text key={label} x={x} y={height - 4} className="chart-axis-label">{label}</text>;
        })}
      </svg>
      <div className="chart-legend">{series.map((item, index) => <span key={item.label}><i className={`line-${index}`} />{item.label}</span>)}</div>
    </div>
  );
}

function StudentProgressTracker({ series }) {
  const labels = ["Baseline", "Quiz 1", "Oral", "Writing", "Latest"];
  return (
    <div className="student-progress-tracker">
      <div className="progress-head"><span>Pupil</span>{labels.map((label) => <span key={label}>{label}</span>)}<span>Change</span><span>Action</span></div>
      {series.map((student) => {
        const first = student.values[0];
        const latest = student.values[student.values.length - 1];
        const change = latest - first;
        const action = latest <= 3 ? "Intervention" : change === 0 ? "Monitor" : "On track";
        return (
          <div className="progress-row" key={student.label}>
            <strong>{student.label}</strong>
            {student.values.map((value, index) => <i key={index} className={value <= 2 ? "low" : value <= 4 ? "mid" : "high"}>TP{value}</i>)}
            <b className={change > 0 ? "up" : "flat"}>{change > 0 ? `+${change}` : change}</b>
            <em className={action === "Intervention" ? "urgent" : ""}>{action}</em>
          </div>
        );
      })}
    </div>
  );
}

function RadialGauge({ value }) {
  return <div className="radial-gauge" style={{ "--value": value }}><strong>{value}%</strong></div>;
}

function StackedBar({ segments }) {
  const colors = ["#df5a72", "#d89414", "#8b5cf6", "#6d4fd7", "#13a579", "#0ea5a5"];
  return <div className="stacked-bar-wrap"><div className="stacked-bar">{segments.map((value, index) => <span key={index} style={{ width: `${value}%`, background: colors[index] }} title={`TP${index + 1}: ${value}%`} />)}</div><div className="stacked-labels">{segments.map((value, index) => <small key={index}>TP{index + 1} {value}%</small>)}</div></div>;
}

function StandardDistribution() {
  const curve = "M18,88 C42,84 58,72 78,48 C96,24 118,18 138,34 C154,48 168,58 182,52";
  const bands = [
    { label: "TP1", width: 12, tone: "rose" },
    { label: "TP2", width: 16, tone: "amber" },
    { label: "TP3", width: 18, tone: "violet" },
    { label: "TP4", width: 24, tone: "primary" },
    { label: "TP5", width: 18, tone: "emerald" },
    { label: "TP6", width: 12, tone: "indigo" },
  ];
  return (
    <div className="standard-distribution">
      <div className="distribution-curve">
        <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet">
          <ChartGrid width={200} height={96} padX={12} padY={10} rows={3} />
          <path className="curve-fill" d={`${curve} L182,96 L18,96 Z`} />
          <path className="curve-line" d={curve} />
          <line x1="128" y1="12" x2="128" y2="96" className="mean-line" />
          <circle cx="128" cy="34" r="4.5" className="mean-dot" />
        </svg>
        <i className="mean-marker"><em>Mean TP 4.1</em></i>
      </div>
      <div className="distribution-bands">
        {bands.map((band) => <span key={band.label} className={band.tone} style={{ flex: band.width }}><b>{band.label}</b></span>)}
      </div>
    </div>
  );
}

function RadarChart({ data }) {
  const size = 340;
  const center = size / 2;
  const radius = 92;
  const labelRadius = radius + 42;
  const levels = [25, 50, 75, 100];

  const getPoint = (index, value) => {
    const angle = (-90 + (360 / data.length) * index) * Math.PI / 180;
    const r = radius * (value / 100);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      lx: center + Math.cos(angle) * labelRadius,
      ly: center + Math.sin(angle) * labelRadius,
      ax: center + Math.cos(angle) * radius,
      ay: center + Math.sin(angle) * radius,
    };
  };

  const vertices = data.map((item, index) => ({ ...getPoint(index, item.value), ...item }));
  const polygonPoints = vertices.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="radar-chart-wrap">
      <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        {levels.map((level) => <circle key={level} cx={center} cy={center} r={radius * (level / 100)} className="radar-grid" />)}
        {levels.map((level) => (
          <text key={`level-${level}`} x={center + 4} y={center - radius * (level / 100) + 4} className="radar-level">{level}</text>
        ))}
        {data.map((item, index) => {
          const point = getPoint(index, 100);
          return <line key={item.label} x1={center} y1={center} x2={point.ax} y2={point.ay} className="radar-spoke" />;
        })}
        <polygon points={polygonPoints} className="radar-area" />
        {vertices.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="5" className="radar-dot" />)}
        {vertices.map((point) => (
          <text key={`label-${point.label}`} x={point.lx} y={point.ly} className="radar-label">{point.label}</text>
        ))}
      </svg>
      <div className="radar-legend">
        {vertices.map((item) => (
          <span key={item.label} className={item.value < 65 ? "weak" : item.value < 80 ? "mid" : "strong"}>
            <b>{item.value}%</b>
            <small>{item.label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskBreakdown() {
  const groups = [
    { label: "High", count: 5, pupils: "Danish, Iman, Zikri, Mira, Haziq", tone: "high" },
    { label: "Medium", count: 9, pupils: "Needs monitoring after next writing task", tone: "medium" },
    { label: "Low", count: 18, pupils: "On track for current topic", tone: "low" },
  ];
  return (
    <div className="risk-breakdown">
      <div className="risk-summary">
        <strong>5</strong>
        <span>pupils need immediate support</span>
      </div>
      <div className="risk-bars">
        {groups.map((group) => (
          <div key={group.label} className={group.tone}>
            <label><b>{group.label} risk</b><span>{group.count} pupils</span></label>
            <i style={{ width: `${(group.count / 18) * 100}%` }} />
            <small>{group.pupils}</small>
          </div>
        ))}
      </div>
      <div className="risk-action"><AlertTriangle /> Start with vocabulary pre-teaching and sentence frames for the high-risk group.</div>
    </div>
  );
}

function TPHeatmap() {
  const rows = [["2 Cem", [1, 3, 7, 10, 4, 1]], ["5 Maju", [2, 5, 8, 7, 3, 0]], ["6 Amanah", [0, 2, 5, 9, 8, 4]]];
  return <div className="tp-heatmap"><span />{["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"].map((tp) => <b key={tp}>{tp}</b>)}{rows.map(([label, values]) => <React.Fragment key={label}><strong>{label}</strong>{values.map((value, index) => <i key={`${label}-${index}`} style={{ "--heat": value / 12 }}>{value}</i>)}</React.Fragment>)}</div>;
}

function BoxPlot() {
  const width = 340;
  const height = 120;
  const tps = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];
  const getX = (idx) => 35 + idx * 57;

  return (
    <div className="box-plot-wrap" style={{ width: "100%", padding: "10px 0" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Grid lines and tick marks */}
        {tps.map((label, idx) => {
          const x = getX(idx);
          return (
            <g key={label}>
              <line x1={x} y1="20" x2={x} y2="85" stroke="color-mix(in srgb, var(--border) 70%, transparent)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={x} y1="85" x2={x} y2="90" stroke="var(--muted)" strokeWidth="1.5" />
              <text x={x} y="104" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="700">{label}</text>
            </g>
          );
        })}
        {/* Horizontal Axis Baseline */}
        <line x1="35" y1="85" x2="320" y2="85" stroke="var(--muted)" strokeWidth="2" />

        {/* Whisker line from TP2 (idx=1) to TP6 (idx=5) */}
        <line x1={getX(1)} y1="52" x2={getX(5)} y2="52" stroke="var(--muted)" strokeWidth="2.5" />
        <line x1={getX(1)} y1="44" x2={getX(1)} y2="60" stroke="var(--muted)" strokeWidth="2.5" />
        <line x1={getX(5)} y1="44" x2={getX(5)} y2="60" stroke="var(--muted)" strokeWidth="2.5" />

        {/* Box from TP3 (idx=2) to TP5 (idx=4) */}
        <rect
          x={getX(2)}
          y="32"
          width={getX(4) - getX(2)}
          height="40"
          rx="6"
          fill="color-mix(in srgb, var(--primary) 20%, transparent)"
          stroke="var(--primary)"
          strokeWidth="2.5"
        />

        {/* Median Line at TP4 (idx=3) */}
        <line x1={getX(3)} y1="32" x2={getX(3)} y2="72" stroke="var(--rose)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Outlier Dot near TP6 */}
        <circle cx={getX(5) + 8} cy="52" r="4.5" fill="var(--amber)" stroke="var(--card)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function ScatterPlot({ points }) {
  const width = 340;
  const height = 220;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 35;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const xTicks = [60, 70, 80, 90, 100];
  const yTicks = [1, 2, 3, 4, 5, 6];

  const mapX = (val) => padLeft + ((Math.max(60, Math.min(100, val)) - 60) / 40) * innerW;
  const mapY = (val) => padTop + innerH - ((Math.max(1, Math.min(6, val)) - 1) / 5) * innerH;

  return (
    <div className="scatter-plot-wrap" style={{ width: "100%", padding: "8px 0" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Horizontal Grid lines and Y-axis Ticks */}
        {yTicks.map((tp) => {
          const y = mapY(tp);
          return (
            <g key={`y-${tp}`}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="color-mix(in srgb, var(--border) 70%, transparent)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={padLeft - 5} y1={y} x2={padLeft} y2={y} stroke="var(--muted)" strokeWidth="1.5" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fill="var(--foreground)" fontSize="11" fontWeight="700">TP{tp}</text>
            </g>
          );
        })}

        {/* Vertical Grid lines and X-axis Ticks */}
        {xTicks.map((att) => {
          const x = mapX(att);
          return (
            <g key={`x-${att}`}>
              <line x1={x} y1={padTop} x2={x} y2={padTop + innerH} stroke="color-mix(in srgb, var(--border) 50%, transparent)" strokeWidth="1" strokeDasharray="2 2" />
              <line x1={x} y1={padTop + innerH} x2={x} y2={padTop + innerH + 5} stroke="var(--muted)" strokeWidth="1.5" />
              <text x={x} y={padTop + innerH + 18} textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="700">{att}%</text>
            </g>
          );
        })}

        {/* X and Y Axis Lines */}
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="var(--muted)" strokeWidth="2" />
        <line x1={padLeft} y1={padTop + innerH} x2={width - padRight} y2={padTop + innerH} stroke="var(--muted)" strokeWidth="2" />

        {/* Axis Titles */}
        <text x={padLeft + innerW / 2} y={height - 3} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="800" letterSpacing="0.05em">ATTENDANCE RATE (%)</text>
        <text transform={`rotate(-90 12 ${padTop + innerH / 2})`} x="12" y={padTop + innerH / 2} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="800" letterSpacing="0.05em">PROFICIENCY BAND (TP)</text>

        {/* Trendline (approximate linear regression from bottom-left to top-right) */}
        <line x1={mapX(64)} y1={mapY(2.2)} x2={mapX(96)} y2={mapY(5.3)} stroke="var(--rose)" strokeWidth="1.8" strokeDasharray="4 4" opacity="0.6" />

        {/* Scatter Points */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle cx={mapX(pt.x)} cy={mapY(pt.y)} r="6" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
            <circle cx={mapX(pt.x)} cy={mapY(pt.y)} r="2.5" fill="#ffffff" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function Treemap({ data }) {
  return <div className="treemap">{data.map((item, index) => <div key={item.label} className={`tile-${index}`} style={{ flexGrow: item.value }}><strong>{item.label}</strong><span>{item.value}%</span></div>)}</div>;
}

function DonutChart({ data }) {
  const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let current = 0;
  const gradient = data.map((item, index) => {
    const pct = (Number(item.value || 0) / total) * 100;
    const start = current;
    current += pct;
    return `${colors[index % colors.length]} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  }).join(", ");

  return (
    <div className="donut-wrap" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
      <div
        className="donut-chart"
        style={{
          background: `conic-gradient(${gradient})`,
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--clay-card)",
          position: "relative",
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
          }}
        >
          <strong style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--foreground)" }}>100%</strong>
          <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600 }}>EVIDENCE</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {data.map((item, index) => {
          const pct = Math.round((Number(item.value || 0) / total) * 100);
          return (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
              <i style={{ width: "10px", height: "10px", borderRadius: "50%", background: colors[index % colors.length], display: "inline-block", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <b style={{ fontWeight: 800 }}>{pct}%</b>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function VerticalBars({ data }) {
  return <div className="vertical-bars">{data.map((item) => <div key={item.label}><span style={{ height: `${item.value}%` }} /><small>{item.label}</small><b>{item.value}</b></div>)}</div>;
}

function AssessmentScoreSummary({ data }) {
  return (
    <div className="assessment-score-list">
      {data.map((item) => {
        const difficulty = item.value < 65 ? "Hard" : item.value < 75 ? "Moderate" : "Good";
        return (
          <div key={item.label}>
            <header><strong>{item.label}</strong><span>{item.value}% avg</span></header>
            <i><b style={{ width: `${item.value}%` }} /></i>
            <footer><small>Difficulty: {difficulty}</small><em>{item.value < 65 ? "Needs reteach" : item.value < 75 ? "Monitor" : "On track"}</em></footer>
          </div>
        );
      })}
    </div>
  );
}

function TimelineChart() {
  return <div className="timeline-chart">{["Quiz", "Observe", "Writing", "Project"].map((item, index) => <div key={item} className={index === 2 ? "late" : ""}><i /><strong>{item}</strong><span>{index === 2 ? "Overdue" : "Done"}</span></div>)}</div>;
}

function ProjectionChart() {
  return <MultiLineChart series={[{ label: "Actual", values: [3.6, 3.8, 4.1, 4.3] }, { label: "Forecast", values: [4.3, 4.5, 4.7, 4.9] }]} max={6} />;
}

function PriorityMatrix() {
  return <div className="priority-matrix"><span>High importance</span><span>High risk</span><i style={{ left: "72%", bottom: "78%" }}>Danish</i><i style={{ left: "60%", bottom: "64%" }}>Zikri</i><i style={{ left: "32%", bottom: "42%" }}>Mira</i></div>;
}

function AnomalyChart() {
  const values = [72, 74, 71, 62, 60, 58];
  return (
    <div className="anomaly-chart">
      <MiniLineChart values={values} max={100} tone="rose" />
      <div className="anomaly-copy">
        <strong>Writing decline detected</strong>
        <span>3 consecutive drops · latest 58%</span>
        <div className="anomaly-tags">
          {values.map((value, index) => (
            <em key={index} className={index >= 3 ? "drop" : ""}>{value}%</em>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIAnalysis() {
  return <section className="dashboard-grid"><Card className="span-2" title="English Topic Mastery Heatmap"><Heatmap /></Card><Card title="Intervention Suggestion"><p className="body-copy">Use a 15-minute mini lesson, 3-4 pupil groups, picture cards, sentence frames and short oral checks.</p></Card></section>;
}

function Heatmap() {
  const students = ["Aishah", "Danish", "Iman", "Nurul", "Zikri", "Fatimah", "Haziq", "Mira"];
  const topics = ["Main Idea", "Past Tense", "Opinion", "Listening", "Email", "Phonics"];
  return <div className="heatmap"><div />{topics.map((topic) => <strong key={topic}>{topic}</strong>)}{students.map((student, row) => <React.Fragment key={student}><span>{student}</span>{topics.map((topic, col) => { const value = [82,65,78,70,60,75,45,38,52,48,35,50,40,35,48,42,32,45,92,85,90,88,82,90,48,42,55,50,38,52,95,90,92,94,88,93,72,68,75,70,65,72,62,58,65,60,55,63][row * 6 + col]; return <i key={topic} className={value > 80 ? "high" : value > 60 ? "mid" : "low"}>{value}</i>; })}</React.Fragment>)}</div>;
}

/* ==========================================================================
   PHOTO-ACCURATE ANALYTICS SVG COMPONENTS (Image ID: 2BNC1A4 UI Overhaul)
   ========================================================================== */

function PhotoRadialRings({ rings = [] }) {
  const defaultRings = [
    { value: 66, label: "Reading", color: "#ec4899" },
    { value: 78, label: "Writing", color: "#14b8a6" },
    { value: 58, label: "Speaking", color: "#8b5cf6" },
    { value: 94, label: "Grammar", color: "#f59e0b" },
  ];
  const list = rings.length ? rings : defaultRings;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "14px" }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--foreground)" }}>Core Skill Competency (TP4+ Attainment)</h4>
        <p style={{ margin: "3px 0 0 0", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.3 }}>
          Percentage of pupils achieving proficiency band TP4, TP5, or TP6 in the 4 primary KSSR English domains.
        </p>
      </div>
      <div className="radial-rings-grid">
        {list.map((item, idx) => {
          const radius = 28;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (Math.min(100, Math.max(0, item.value)) / 100) * circumference;
          return (
            <div key={idx} className="radial-ring-item">
              <svg className="radial-ring-svg" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={radius} className="radial-ring-circle-bg" />
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  className="radial-ring-circle-progress"
                  style={{ stroke: item.color || "#6366f1", strokeDasharray: circumference, strokeDashoffset: offset }}
                />
              </svg>
              <span className="radial-ring-value">{item.value}%</span>
              <span className="radial-ring-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoSegmentedProgress({ tracks = [] }) {
  const defaultTracks = [
    { title: "TP4+ Mastery Rate", value: 82, statLabel: "+12% vs Term 1", trend: "up", color: "emerald" },
    { title: "Evidence Collection Rate", value: 65, statLabel: "+18 PBD Logged", trend: "up", color: "indigo" },
    { title: "Student Engagement Index", value: 94, statLabel: "94% Active Rate", trend: "up", color: "cyan" },
  ];
  const list = tracks.length ? tracks : defaultTracks;
  return (
    <div className="segmented-root">
      <div className="segmented-head">
        <h4>PBD Operational &amp; Engagement Metrics</h4>
        <p>Tracking mastery velocity, evidence logging, and class participation.</p>
      </div>
      <div className="segmented-list-wrap">
        {list.map((track, idx) => {
          const totalPills = 12;
          const activeCount = Math.round((track.value / 100) * totalPills);
          return (
            <div key={idx} className="segmented-list-row">
              <div className="segmented-track-col">
                <div className="segmented-track-top">
                  <span className="segmented-track-title">{track.title}</span>
                  <span className={`segmented-value ${track.color || "emerald"}`}>{track.value}%</span>
                </div>
                <div className="segmented-bars-strip">
                  {Array.from({ length: totalPills }, (_, i) => (
                    <span key={i} className={`segmented-bar-pill ${i < activeCount ? `active ${track.color || "emerald"}` : ""}`} />
                  ))}
                </div>
              </div>
              <div className={`segmented-stat-badge ${track.trend === "up" ? "up" : "down"}`}>
                {track.trend === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                <span>{track.statLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoMiniStrip({ groups = [] }) {
  const defaultGroups = [
    { stat: "32", label: "Total Pupils Tracked", bars: [30, 65, 80, 50, 90, 40] },
    { stat: "24", label: "TP4-TP6 Achieved", bars: [60, 40, 85, 70, 95, 55] },
    { stat: "8", label: "Needs Reteaching", bars: [45, 75, 60, 88, 52, 78] },
  ];
  const list = groups.length ? groups : defaultGroups;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "14px" }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--foreground)" }}>Pupil Mastery Cohort Distribution</h4>
        <p style={{ margin: "3px 0 0 0", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.3 }}>
          Cohort breakdown by overall attainment tiers and intervention requirements across PBD evaluations.
        </p>
      </div>
      <div className="mini-strip-grid">
        {list.map((grp, idx) => (
          <div key={idx} className="mini-strip-col">
            <span className="mini-strip-stat">{grp.stat}</span>
            {grp.label && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", marginBottom: 4, display: "block" }}>{grp.label}</span>}
            <div className="mini-strip-bars">
              {grp.bars.map((h, i) => (
                <span key={i} className={`mini-strip-bar ${i % 2 === 0 ? "" : "dim"}`} style={{ height: `${Math.max(12, h)}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoDonutChart({ segments = [], totalAmount = "84.5% KSSR", activeTerm = "Term 1", onSelectTerm }) {
  const defaultSegments = [
    { label: "Reading Mastery", value: 38, color: "#8b5cf6" },
    { label: "Writing Accuracy", value: 31, color: "#3b82f6" },
    { label: "Speaking Confidence", value: 30, color: "#6366f1" },
    { label: "Listening Skills", value: 29, color: "#f97316" },
    { label: "Grammar & Vocab", value: 15, color: "#eab308" },
    { label: "Critical KBAT", value: 5, color: "#ec4899" },
  ];
  const list = segments.length ? segments : defaultSegments;
  const sum = list.reduce((a, b) => a + Number(b.value), 0) || 1;
  let accumulated = 0;
  const gradientStops = list.map((item) => {
    const start = accumulated;
    accumulated += (Number(item.value) / sum) * 100;
    return `${item.color} ${start}% ${accumulated}%`;
  }).join(", ");

  return (
    <div className="donut-card-layout" style={{ width: "100%", overflow: "visible" }}>
      <div style={{ marginBottom: "14px" }}>
        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--foreground)" }}>PBD Skill Mastery Breakdown</h4>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.3 }}>
          Percentage of pupils achieving TP4–TP6 competency across the 6 core English KSSR assessment domains.
        </p>
      </div>
      <div className="donut-top-split" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", overflow: "visible" }}>
        <div className="donut-chart-container" style={{ position: "relative", width: "150px", height: "150px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "visible" }}>
          <div
            className="donut-svg-ring"
            style={{
              background: `conic-gradient(${gradientStops})`,
              borderRadius: "50%",
              width: "150px",
              height: "150px",
              flexShrink: 0,
              mask: "radial-gradient(circle at center, transparent 58%, black 59%)",
              WebkitMask: "radial-gradient(circle at center, transparent 58%, black 59%)",
            }}
          />
          <div
            className="donut-center-badge"
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              background: "var(--card)",
              borderRadius: "50%",
              width: "78px",
              height: "78px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              pointerEvents: "none"
            }}
          >
            <strong style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>84.5%</strong>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)" }}>Mastery</span>
          </div>
        </div>
        <div className="donut-legend-list" style={{ flex: 1, minWidth: 0 }}>
          {list.map((item, idx) => (
            <div key={idx} className="donut-legend-item" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="donut-legend-dot" style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem", color: "var(--foreground)", fontWeight: 600 }}>{item.label}</span>
              <strong style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--foreground)" }}>{typeof item.value === "number" ? `${Math.round(item.value)}%` : item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="donut-bottom-badge" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="donut-total-stat" style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>{totalAmount}</span>
        <span className="donut-total-tag" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)" }}>▲ KSSR BENCHMARK MET</span>
      </div>
    </div>
  );
}

function PhotoPeakDotWave({ title = "KSSR · TP MASTERY PROGRESSION", subtitle = "ENGLISH PBD CURRICULUM PERFORMANCE & CONTINUOUS ASSESSMENT", mainStat = "TP 4.6", subStat = "AVERAGE CLASS BAND OUT OF TP6", seriesA = [], seriesB = [], xLabels = [] }) {
  const defaultSeriesA = [35, 52, 68, 48, 76, 85, 45, 62, 55, 92, 50, 42, 70, 80, 58, 48, 65, 40, 55, 30];
  const defaultSeriesB = [20, 38, 45, 30, 55, 60, 32, 44, 38, 70, 36, 28, 52, 60, 42, 35, 48, 26, 38, 18];
  const sA = seriesA.length ? seriesA : defaultSeriesA;
  const sB = seriesB.length ? seriesB : defaultSeriesB;
  const labels = xLabels.length ? xLabels : Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, "0"));
  const width = 640;
  const height = 240;
  const max = Math.max(...sA, ...sB, 100);

  const getPoints = (arr) => arr.map((val, idx) => {
    const x = (idx / Math.max(1, arr.length - 1)) * (width - 40) + 20;
    const y = height - 20 - (val / max) * (height - 44);
    return { x, y, val };
  });

  const ptsA = getPoints(sA);
  const ptsB = getPoints(sB);

  const buildSmoothPath = (pts) => {
    if (!pts.length) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const midX = (curr.x + next.x) / 2;
      d += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
    }
    return d;
  };

  const pathA = buildSmoothPath(ptsA);
  const pathB = buildSmoothPath(ptsB);
  const areaA = `${pathA} L ${width - 20},${height - 20} L 20,${height - 20} Z`;
  const areaB = `${pathB} L ${width - 20},${height - 20} L 20,${height - 20} Z`;

  // Find peak dots (local maxima or high points to highlight with white circular dots)
  const peakDots = ptsA.filter((pt, idx) => idx % 3 === 2 || pt.val > 75);

  return (
    <div className="photo-chart-card" style={{ height: "100%" }}>
      <div className="area-wave-header">
        <div className="area-wave-title">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="area-wave-metric">
          <strong>{mainStat}</strong>
          <span>{subStat}</span>
        </div>
      </div>
      <div className="area-wave-svg-container">
        <svg className="area-wave-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="waveGradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points={areaB.replace(/^M/, "")} fill="url(#waveGradB)" />
          <path d={pathB} fill="none" stroke="#ec4899" strokeWidth="3" />
          <polygon points={areaA.replace(/^M/, "")} fill="url(#waveGradA)" />
          <path d={pathA} fill="none" stroke="#8b5cf6" strokeWidth="3.5" />
          {peakDots.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="7" fill="#ffffff" stroke="#8b5cf6" strokeWidth="3.5" />
              <circle cx={pt.x} cy={pt.y} r="3" fill="#8b5cf6" />
            </g>
          ))}
        </svg>
      </div>
      <div className="area-wave-x-axis">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

function PhotoEqualizerChart({ bars = [], categories = ["READING", "WRITING", "SPEAKING", "GRAMMAR"] }) {
  const defaultBars = [12, -8, 16, -10, 20, -14, 22, -12, 18, -15, 25, -18, 14, -10];
  const list = bars.length ? bars : defaultBars;
  const height = 140;
  const width = 320;
  const midY = height / 2;
  const max = Math.max(...list.map(Math.abs), 25);

  return (
    <div className="equalizer-chart-wrap">
      <svg className="equalizer-svg-area" viewBox={`0 0 ${width} ${height}`}>
        <line x1="0" y1={midY} x2={width} y2={midY} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
        {list.map((val, idx) => {
          const x = (idx / Math.max(1, list.length - 1)) * (width - 24) + 12;
          const barH = (Math.abs(val) / max) * (midY - 10);
          const y = val >= 0 ? midY - barH : midY;
          return (
            <rect
              key={idx}
              x={x - 4}
              y={y}
              width="8"
              height={Math.max(4, barH)}
              rx="4"
              fill={val >= 0 ? "#14b8a6" : "#06b6d4"}
            />
          );
        })}
      </svg>
      <div className="equalizer-pills-row">
        {categories.map((cat, idx) => (
          <span key={idx} className="equalizer-tag-pill">{cat}</span>
        ))}
      </div>
    </div>
  );
}

function PhotoStepSparklines({ rows = [], activeStep = 3, onStepClick }) {
  const defaultRows = [
    { number: "86% Quiz Avg Score", wave: [12, 18, 14, 22, 16, 25, 20] },
    { number: "92% Oral Proficiency", wave: [20, 15, 24, 18, 28, 22, 30] },
    { number: "78% Written Accuracy", wave: [10, 14, 12, 18, 15, 20, 16] },
  ];
  const list = rows.length ? rows : defaultRows;
  const miniGrids = [1, 5, 10, 15, 20, 25, 33, 35];

  return (
    <div className="sparkline-rows-wrap">
      <div>
        {list.map((row, idx) => {
          const w = 180;
          const h = 28;
          const max = Math.max(...row.wave, 30);
          const pts = row.wave.map((v, i) => `${(i / (row.wave.length - 1)) * w},${h - (v / max) * (h - 6)}`).join(" ");
          return (
            <div key={idx} className="sparkline-row-item" style={{ marginBottom: 12 }}>
              <span className="sparkline-number">{row.number}</span>
              <svg className="sparkline-svg-wave" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                <polyline points={pts} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32, justifyContent: "space-between", margin: "4px 0" }}>
        {miniGrids.map((num, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ width: 6, height: Math.min(26, num * 0.75), background: "#06b6d4", borderRadius: 3 }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#64748b" }}>{num}</span>
          </div>
        ))}
      </div>
      <div className="step-badges-strip">
        {["01", "02", "03", "04", "05"].map((step, idx) => (
          <button
            type="button"
            key={step}
            className={`step-badge-circle ${idx + 1 === activeStep ? "active" : ""}`}
            onClick={() => onStepClick && onStepClick(idx + 1)}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoSummaryBadge({ bigNumber = "TP 4.8 / 6.0", pillLabel = "KSSR PBD ALIGNED", subStat = "32 Pupils Tracked", wavePoints = [10, 18, 14, 25, 20, 30, 22] }) {
  const w = 140;
  const h = 36;
  const max = Math.max(...wavePoints, 30);
  const pts = wavePoints.map((v, i) => `${(i / (wavePoints.length - 1)) * w},${h - (v / max) * (h - 8)}`).join(" ");

  return (
    <div className="summary-badge-layout">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="summary-top-metric">
          <span className="summary-big-number">{bigNumber}</span>
          <span className="summary-sub-stat">{subStat}</span>
        </div>
      </div>
      <span className="summary-pill-tag">{pillLabel}</span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["01", "02", "03", "04", "05"].map((st, i) => (
            <span key={st} style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", fontWeight: 800, color: i === 2 ? "#ec4899" : "#64748b", background: i === 2 ? "#fdf2f8" : "transparent" }}>
              {st}
            </span>
          ))}
        </div>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={w / 2} cy={h / 2} r="4" fill="#ec4899" />
        </svg>
      </div>
    </div>
  );
}

export {
  AnalysisCard,
  AIAnalysisBlock,
  AnalyticsSection,
  MiniChartCard,
  buildChartPoints,
  ChartGrid,
  MiniLineChart,
  AreaChart,
  MultiLineChart,
  StudentProgressTracker,
  RadialGauge,
  StackedBar,
  StandardDistribution,
  RadarChart,
  RiskBreakdown,
  TPHeatmap,
  BoxPlot,
  ScatterPlot,
  Treemap,
  DonutChart,
  VerticalBars,
  AssessmentScoreSummary,
  TimelineChart,
  ProjectionChart,
  PriorityMatrix,
  AnomalyChart,
  AIAnalysis,
  Heatmap,
  PhotoRadialRings,
  PhotoSegmentedProgress,
  PhotoMiniStrip,
  PhotoDonutChart,
  PhotoPeakDotWave,
  PhotoEqualizerChart,
  PhotoStepSparklines,
  PhotoSummaryBadge,
};
