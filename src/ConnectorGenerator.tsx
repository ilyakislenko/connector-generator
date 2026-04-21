import { useState, useCallback } from "react";

interface ConnectorConfig {
  words: string;
  color: string;
  strokeWidth: number;
  radius: number;
  gap: number;
  armLength: number;
}

function generateSVG(config: ConnectorConfig): string {
  const { words: rawWords, color, strokeWidth: sw, radius: rad, gap, armLength: arm } = config;
  const words = rawWords.split("\n").map((w) => w.trim()).filter(Boolean);

  const spineX = 60;
  const startY = 30;
  const fontSize = 18;
  const textX = spineX + rad + arm + 8;

  const positions = words.map((_, i) => startY + i * gap);
  const lastY = positions[positions.length - 1] ?? startY;
  const svgH = lastY + 40;

  const lineProps = `stroke="${color}" stroke-width="${sw}" stroke-linecap="round" fill="none"`;

  let paths = "";

  // Vertical spine — stops at the curve start of last item
  paths += `<line ${lineProps} x1="${spineX}" y1="0" x2="${spineX}" y2="${lastY - rad}"/>`;

  positions.forEach((y, i) => {
    const isLast = i === positions.length - 1;
    const ex = spineX + rad + arm;

    // Top curve + horizontal arm
    paths += `<path ${lineProps} d="M${spineX},${y - rad} Q${spineX},${y} ${spineX + rad},${y} L${ex},${y}"/>`;

    // Bottom mirror curve (not on last item)
    if (!isLast) {
      paths += `<path ${lineProps} d="M${ex},${y} L${spineX + rad},${y} Q${spineX},${y} ${spineX},${y + rad}"/>`;
    }

    // Label
    paths += `<text x="${textX}" y="${y + fontSize * 0.35}" font-family="sans-serif" font-size="${fontSize}" font-weight="400" fill="#aaaaaa">${words[i]}</text>`;
  });

  return `<svg width="100%" viewBox="0 0 300 ${svgH}" xmlns="http://www.w3.org/2000/svg">\n${paths}\n</svg>`;
}

interface SliderRowProps {
  label: string;
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, min, max, step, value, onChange }: SliderRowProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#888" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: "#888", minWidth: 28 }}>{value}</span>
      </div>
    </div>
  );
}

export default function ConnectorGenerator() {
  const [config, setConfig] = useState<ConnectorConfig>({
    words: "r\ne\neeee\nwow\nа жаль\nхлеб",
    color: "#6b6b75",
    strokeWidth: 2.5,
    radius: 6,
    gap: 90,
    armLength: 34,
  });

  const [copied, setCopied] = useState(false);

  const update = useCallback(<K extends keyof ConnectorConfig>(key: K, value: ConnectorConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const svgCode = generateSVG(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(svgCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ display: "flex", gap: 24, padding: 20, fontFamily: "monospace" }}>
      {/* Controls */}
      <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#888" }}>Слова (каждое с новой строки)</label>
          <textarea
            value={config.words}
            onChange={(e) => update("words", e.target.value)}
            rows={7}
            style={{
              resize: "vertical",
              background: "#1a1a1a",
              border: "0.5px solid #333",
              borderRadius: 8,
              color: "#ccc",
              fontFamily: "monospace",
              fontSize: 13,
              padding: 10,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "#888" }}>Цвет линии</label>
          <input
            type="color"
            value={config.color}
            onChange={(e) => update("color", e.target.value)}
            style={{ width: "100%", height: 32, border: "none", background: "none", cursor: "pointer" }}
          />
        </div>

        <SliderRow label="Толщина линии" id="sw" min={1} max={6} step={0.5} value={config.strokeWidth} onChange={(v) => update("strokeWidth", v)} />
        <SliderRow label="Радиус закругления" id="r" min={2} max={20} step={1} value={config.radius} onChange={(v) => update("radius", v)} />
        <SliderRow label="Расстояние между словами" id="gap" min={40} max={140} step={5} value={config.gap} onChange={(v) => update("gap", v)} />
        <SliderRow label="Длина горизонтали" id="arm" min={10} max={60} step={2} value={config.armLength} onChange={(v) => update("armLength", v)} />

        <button
          onClick={handleCopy}
          style={{ padding: "8px 0", fontSize: 13, cursor: "pointer", borderRadius: 8 }}
        >
          {copied ? "Скопировано ✓" : "Скопировать SVG ↗"}
        </button>
      </div>

      {/* Preview + code */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div dangerouslySetInnerHTML={{ __html: svgCode }} />
        <textarea
          readOnly
          value={svgCode}
          rows={10}
          style={{
            background: "#1a1a1a",
            border: "0.5px solid #222",
            borderRadius: 8,
            color: "#666",
            fontFamily: "monospace",
            fontSize: 11,
            padding: 10,
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}
