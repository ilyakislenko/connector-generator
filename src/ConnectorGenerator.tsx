import { useState, useCallback, useRef } from "react";
type ConnectorStyle = "bracket" | "straight" | "tree" | "arrow";
type Direction = "right" | "left";
type ExportFormat = "svg" | "jsx" | "html";

interface ConnectorConfig {
  words: string;
  color: string;
  strokeWidth: number;
  radius: number;
  gap: number;
  armLength: number;
  style: ConnectorStyle;
  direction: Direction;
  fontSize: number;
  textColor: string;
  animated: boolean;
  dashed: boolean;
  showDots: boolean;
}

// ─── Core SVG Generator ───────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateSVG(config: ConnectorConfig): string {
  const {
    words: rawWords, color, strokeWidth: sw, radius: rad,
    gap, armLength: arm, style, direction,
    fontSize, textColor, animated, dashed, showDots,
  } = config;

  const words = rawWords.split("\n").map((w) => w.trim()).filter(Boolean);
  if (words.length === 0)
    return `<svg width="100%" viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg"></svg>`;

  const spineX = direction === "right" ? 40 : 260;
  const startY = 30;
  const textX =
    direction === "right"
      ? spineX + rad + arm + 10
      : spineX - rad - arm - 10;

  const positions = words.map((_, i) => startY + i * gap);
  const lastY = positions[positions.length - 1] ?? startY;
  const svgH = lastY + 40;
  const svgW = 300;

  const dashAttr = dashed ? `stroke-dasharray="6 4"` : "";
  const animStyle = animated
    ? `style="animation:drawLine 1.2s ease forwards;stroke-dashoffset:1000;stroke-dasharray:1000"`
    : "";
  const lp = `stroke="${color}" stroke-width="${sw}" stroke-linecap="round" fill="none" ${dashAttr} ${animStyle}`;

  const textAnchor = direction === "right" ? "start" : "end";

  let defs = animated
    ? `<defs><style>@keyframes drawLine{to{stroke-dashoffset:0}}</style></defs>`
    : "";

  if (style === "arrow") {
    defs += `<defs><marker id="ah" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="${color}"/>
    </marker></defs>`;
  }

  let paths = "";

  // ── Bracket (Discord style) ──
  if (style === "bracket") {
    paths += `<line ${lp} x1="${spineX}" y1="0" x2="${spineX}" y2="${lastY - rad}"/>`;

    positions.forEach((y, i) => {
      const isLast = i === words.length - 1;
      const qx = direction === "right" ? spineX + rad : spineX - rad;
      const ex = direction === "right" ? spineX + rad + arm : spineX - rad - arm;

      paths += `<path ${lp} d="M${spineX},${y - rad} Q${spineX},${y} ${qx},${y} L${ex},${y}"/>`;
      if (!isLast) {
        paths += `<path ${lp} d="M${ex},${y} L${qx},${y} Q${spineX},${y} ${spineX},${y + rad}"/>`;
      }
      if (showDots) {
        paths += `<circle cx="${ex}" cy="${y}" r="${sw + 1.5}" fill="${color}"/>`;
      }
      paths += `<text x="${textX}" y="${y + fontSize * 0.38}"
        font-family="ui-monospace,monospace" font-size="${fontSize}"
        fill="${textColor}" text-anchor="${textAnchor}">${escapeXml(words[i])}</text>`;
    });
  }

  // ── Straight (file tree style) ──
  if (style === "straight") {
    paths += `<line ${lp} x1="${spineX}" y1="0" x2="${spineX}" y2="${lastY}"/>`;

    positions.forEach((y, i) => {
      const ex = direction === "right" ? spineX + arm : spineX - arm;
      paths += `<line ${lp} x1="${spineX}" y1="${y}" x2="${ex}" y2="${y}"/>`;
      if (showDots) {
        paths += `<circle cx="${ex}" cy="${y}" r="${sw + 1.5}" fill="${color}"/>`;
      }
      paths += `<text x="${textX}" y="${y + fontSize * 0.38}"
        font-family="ui-monospace,monospace" font-size="${fontSize}"
        fill="${textColor}" text-anchor="${textAnchor}">${escapeXml(words[i])}</text>`;
    });
  }

  // ── Tree (branching diagram) ──
  if (style === "tree") {
    const rootX = svgW / 2;
    const rootY = 24;
    const branchY = rootY + 36;

    paths += `<line ${lp} x1="${rootX}" y1="${rootY}" x2="${rootX}" y2="${branchY}"/>`;

    const spacing = svgW / (words.length + 1);
    words.forEach((word, i) => {
      const bx = spacing * (i + 1);
      const by = branchY + 56;
      paths += `<path ${lp} d="M${rootX},${branchY} C${rootX},${branchY + 28} ${bx},${branchY + 10} ${bx},${by}"/>`;
      if (showDots) {
        paths += `<circle cx="${bx}" cy="${by}" r="${sw + 1.5}" fill="${color}"/>`;
      }
      paths += `<text x="${bx}" y="${by + 16}"
        font-family="ui-monospace,monospace" font-size="${fontSize}"
        fill="${textColor}" text-anchor="middle">${escapeXml(word)}</text>`;
    });

    paths += `<text x="${rootX}" y="${rootY - 8}"
      font-family="ui-monospace,monospace" font-size="${fontSize}"
      fill="${textColor}" text-anchor="middle" font-weight="600">root</text>`;

    return `<svg width="100%" viewBox="0 0 ${svgW} 180" xmlns="http://www.w3.org/2000/svg">${defs}${paths}</svg>`;
  }

  // ── Arrow ──
  if (style === "arrow") {
    paths += `<line ${lp} x1="${spineX}" y1="0" x2="${spineX}" y2="${lastY}"/>`;

    positions.forEach((y, i) => {
      const ex =
        direction === "right" ? spineX + arm - 2 : spineX - arm + 2;
      paths += `<line ${lp} marker-end="url(#ah)"
        x1="${spineX}" y1="${y}" x2="${ex}" y2="${y}"/>`;
      if (showDots) {
        paths += `<circle cx="${spineX}" cy="${y}" r="${sw + 1}" fill="${color}"/>`;
      }
      paths += `<text x="${textX}" y="${y + fontSize * 0.38}"
        font-family="ui-monospace,monospace" font-size="${fontSize}"
        fill="${textColor}" text-anchor="${textAnchor}">${escapeXml(words[i])}</text>`;
    });
  }

  return `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">${defs}${paths}</svg>`;
}

function toJSX(svg: string): string {
  return svg
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-dasharray=/g, "strokeDasharray=")
    .replace(/stroke-dashoffset=/g, "strokeDashoffset=")
    .replace(/text-anchor=/g, "textAnchor=")
    .replace(/font-family=/g, "fontFamily=")
    .replace(/font-size=/g, "fontSize=")
    .replace(/font-weight=/g, "fontWeight=")
    .replace(/marker-end=/g, "markerEnd=")
    .replace(/markerWidth=/g, "markerWidth=")
    .replace(/markerHeight=/g, "markerHeight=")
    .replace(/refX=/g, "refX=")
    .replace(/refY=/g, "refY=")
    .replace(/viewBox=/g, "viewBox=")
    .replace(/class=/g, "className=");
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SliderRow({
  label, min, max, step, value, onChange,
}: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 10, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: "#7c7c8a" }}
        />
        <span style={{ fontSize: 11, color: "#666", minWidth: 28, textAlign: "right" }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, Partial<ConnectorConfig>> = {
  "Discord":        { style: "bracket",  color: "#6b6b75", strokeWidth: 2.5, radius: 6,  gap: 90,  armLength: 34, textColor: "#aaaaaa", dashed: false, showDots: false },
  "File tree":      { style: "straight", color: "#4a9eff", strokeWidth: 1.5, radius: 0,  gap: 36,  armLength: 24, textColor: "#7ec8ff", dashed: false, showDots: false },
  "Tree diagram":   { style: "tree",     color: "#50c878", strokeWidth: 2,   radius: 6,  gap: 90,  armLength: 34, textColor: "#80e8a0" },
  "Arrows":         { style: "arrow",    color: "#ff6b6b", strokeWidth: 2,   radius: 6,  gap: 70,  armLength: 40, textColor: "#ff9999" },
  "Dashed":         { style: "bracket",  color: "#c084fc", strokeWidth: 1.5, radius: 8,  gap: 80,  armLength: 34, textColor: "#d8b4fe", dashed: true  },
  "Dots":           { style: "straight", color: "#fb923c", strokeWidth: 2,   radius: 6,  gap: 50,  armLength: 30, textColor: "#fdba74", showDots: true },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectorGenerator() {
  const [config, setConfig] = useState<ConnectorConfig>({
    words: "Button\nInput\nCheckbox\nSelect\nTextarea",
    color: "#6b6b75",
    strokeWidth: 2.5,
    radius: 6,
    gap: 90,
    armLength: 34,
    style: "bracket",
    direction: "right",
    fontSize: 14,
    textColor: "#aaaaaa",
    animated: false,
    dashed: false,
    showDots: false,
  });

  const [exportFormat, setExportFormat] = useState<ExportFormat>("svg");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    <K extends keyof ConnectorConfig>(key: K, value: ConnectorConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const svgCode = generateSVG(config);
  const exportCode =
    exportFormat === "jsx"  ? toJSX(svgCode) :
    exportFormat === "html" ? `<!-- SVG Connector -->\n${svgCode}` :
    svgCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "connector.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const S = {
    wrap: { display: "flex", minHeight: "100vh", background: "#0f0f14", color: "#e0e0e0", fontFamily: "ui-monospace, monospace" } as React.CSSProperties,
    sidebar: { width: 260, borderRight: "0.5px solid #1e1e28", padding: "20px 16px", display: "flex", flexDirection: "column" as const, gap: 18, overflowY: "auto" as const },
    section: { borderTop: "0.5px solid #1e1e28", paddingTop: 14, display: "flex", flexDirection: "column" as const, gap: 10 },
    sectionLabel: { fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    input: { background: "#1a1a22", border: "0.5px solid #2e2e3e", borderRadius: 6, color: "#ccc", padding: "5px 8px", fontFamily: "monospace", fontSize: 12, outline: "none" } as React.CSSProperties,
    select: { background: "#1a1a22", border: "0.5px solid #2e2e3e", borderRadius: 6, color: "#ccc", padding: "6px 8px", fontFamily: "monospace", fontSize: 12, width: "100%", outline: "none" } as React.CSSProperties,
  };

  return (
    <div style={S.wrap}>

      {/* ── Sidebar ── */}
      <div style={S.sidebar}>

        {/* Presets */}
        <div>
          <div style={S.sectionLabel}>Пресеты</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => setConfig((prev) => ({ ...prev, ...PRESETS[name] }))}
                style={{ fontSize: 11, padding: "4px 9px", cursor: "pointer", background: "#1a1a22", border: "0.5px solid #2e2e3e", borderRadius: 5, color: "#999", fontFamily: "monospace" }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Words */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Элементы</div>
          <textarea
            value={config.words}
            onChange={(e) => update("words", e.target.value)}
            rows={6}
            placeholder="Каждый элемент с новой строки..."
            style={{ ...S.input, resize: "vertical", fontSize: 13, padding: 10 }}
          />
        </div>

        {/* Style */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Стиль линий</div>

          <div>
            <label style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Тип</label>
            <select
              value={config.style}
              onChange={(e) => update("style", e.target.value as ConnectorStyle)}
              style={{ ...S.select, marginTop: 4 }}
            >
              <option value="bracket">Bracket — Discord</option>
              <option value="straight">Straight — File tree</option>
              <option value="tree">Tree — Branches</option>
              <option value="arrow">Arrow — со стрелками</option>
            </select>
          </div>

          {config.style !== "tree" && (
            <div>
              <label style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>Направление</label>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {(["right", "left"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => update("direction", d)}
                    style={{
                      flex: 1, padding: "5px 0", fontSize: 11, cursor: "pointer",
                      background: config.direction === d ? "#2a2a35" : "transparent",
                      border: `0.5px solid ${config.direction === d ? "#444" : "#2e2e3e"}`,
                      borderRadius: 6, color: config.direction === d ? "#ddd" : "#555",
                      fontFamily: "monospace",
                    }}
                  >
                    {d === "right" ? "→ right" : "← left"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {[
            { key: "color", label: "Цвет линии" },
            { key: "textColor", label: "Цвет текста" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>{label}</label>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 4 }}>
                <input
                  type="color"
                  value={config[key as keyof ConnectorConfig] as string}
                  onChange={(e) => update(key as keyof ConnectorConfig, e.target.value as any)}
                  style={{ width: 32, height: 28, border: "none", background: "none", cursor: "pointer", borderRadius: 4 }}
                />
                <input
                  type="text"
                  value={config[key as keyof ConnectorConfig] as string}
                  onChange={(e) => update(key as keyof ConnectorConfig, e.target.value as any)}
                  style={{ ...S.input, flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Params */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Параметры</div>
          <SliderRow label="Толщина" min={0.5} max={6} step={0.5} value={config.strokeWidth} onChange={(v) => update("strokeWidth", v)} />
          {config.style === "bracket" && (
            <SliderRow label="Радиус закругления" min={2} max={20} step={1} value={config.radius} onChange={(v) => update("radius", v)} />
          )}
          {config.style !== "tree" && (
            <>
              <SliderRow label="Интервал" min={30} max={150} step={5} value={config.gap} onChange={(v) => update("gap", v)} />
              <SliderRow label="Длина ветки" min={10} max={80} step={2} value={config.armLength} onChange={(v) => update("armLength", v)} />
            </>
          )}
          <SliderRow label="Размер текста" min={10} max={24} step={1} value={config.fontSize} onChange={(v) => update("fontSize", v)} />
        </div>

        {/* Options */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Опции</div>
          {([
            { key: "dashed",   label: "Пунктирная линия" },
            { key: "showDots", label: "Точки на концах" },
            { key: "animated", label: "Анимация отрисовки" },
          ] as { key: keyof ConnectorConfig; label: string }[]).map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#777" }}>
              <input
                type="checkbox"
                checked={config[key] as boolean}
                onChange={(e) => update(key, e.target.checked as any)}
                style={{ accentColor: "#7c7c8a" }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Preview + Code ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Preview */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div
            ref={previewRef}
            style={{ background: "#161620", borderRadius: 12, border: "0.5px solid #1e1e28", padding: 32, maxWidth: 400, width: "100%" }}
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        </div>

        {/* Code panel */}
        <div style={{ borderTop: "0.5px solid #1e1e28", background: "#0c0c10" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "0.5px solid #1e1e28" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["svg", "jsx", "html"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  style={{
                    padding: "4px 11px", fontSize: 11, cursor: "pointer",
                    background: exportFormat === f ? "#2a2a35" : "transparent",
                    border: `0.5px solid ${exportFormat === f ? "#444" : "transparent"}`,
                    borderRadius: 5, color: exportFormat === f ? "#ddd" : "#555",
                    fontFamily: "monospace",
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={handleDownload}
                style={{ padding: "4px 12px", fontSize: 11, cursor: "pointer", background: "#1a1a22", border: "0.5px solid #2e2e3e", borderRadius: 5, color: "#888", fontFamily: "monospace" }}
              >
                ↓ .svg
              </button>
              <button
                onClick={handleCopy}
                style={{
                  padding: "4px 12px", fontSize: 11, cursor: "pointer",
                  background: copied ? "#1e2e1e" : "#1a1a22",
                  border: `0.5px solid ${copied ? "#2e4e2e" : "#2e2e3e"}`,
                  borderRadius: 5, color: copied ? "#50c878" : "#ccc",
                  fontFamily: "monospace", transition: "all 0.15s",
                }}
              >
                {copied ? "✓ Скопировано" : "Копировать"}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={exportCode}
            rows={8}
            style={{ width: "100%", background: "transparent", border: "none", color: "#3a3a4e", fontFamily: "monospace", fontSize: 11, padding: "12px 16px", resize: "none", outline: "none" }}
          />
        </div>
      </div>
    </div>
  );
}