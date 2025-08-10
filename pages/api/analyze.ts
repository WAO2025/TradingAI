// pages/api/analyze.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface Row {
  Date: string;
  Close: number;
  Volume: number;
  [key: string]: string | number;
}

interface Filters {
  minRSI?: string;
  maxRSI?: string;
  minVolumeChange?: string;
  maxVolumeChange?: string;
  maFilter?: "" | "9" | "21" | "50" | "200";
  quickSignal?: "" | "RSI_LOW" | "RSI_HIGH" | "VOLUME" | "GOLDEN" | "DEATH";
}

interface Body {
  rows?: Array<Record<string, unknown>>;
  filters?: Filters;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}

function calcMA(data: Row[], period: number, idx: number): number | null {
  if (idx < period) return null;
  const slice = data.slice(idx - period, idx);
  const sum = slice.reduce((acc, row) => acc + (toNum(row.Close) || 0), 0);
  return sum / period;
}

function calcRSI(data: Row[], period = 14, idx: number): number | null {
  if (idx < period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const curr = toNum(data[i].Close) || 0;
    const prev = toNum(data[i - 1]?.Close) || 0;
    const diff = curr - prev;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { rows, filters }: Body = (req.body ?? {}) as Body;

  if (!Array.isArray(rows)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  // Приводим входные данные к типу Row и числам (без any)
  const data: Row[] = rows.map((r) => {
    const rec = r as Record<string, string | number>;
    return {
      ...rec,
      Close: toNum(rec["Close"]),
      Volume: toNum(rec["Volume"]),
    } as Row;
  });

  const signals: string[] = [];

  for (let i = 1; i < data.length; i++) {
    const curr = data[i];
    const prev = data[i - 1];
    if (!curr || !prev) continue;

    const close = toNum(curr.Close);
    const volume = toNum(curr.Volume);
    const prevVolume = toNum(prev.Volume);
    if (!(close > 0) || !(volume > 0) || !(prevVolume > 0)) continue;

    const rsi = calcRSI(data, 14, i);
    const ma9 = calcMA(data, 9, i);
    const ma21 = calcMA(data, 21, i);
    const ma50 = calcMA(data, 50, i);
    const ma200 = calcMA(data, 200, i);

    const vol1d = ((volume - prevVolume) / prevVolume) * 100;

    const parts: string[] = [
      `${curr.Date}`,
      `Close: ${close.toFixed(2)}`,
      `RSI: ${rsi !== null ? rsi.toFixed(1) : "—"}`,
      `VolΔ: ${isFinite(vol1d) ? vol1d.toFixed(1) + "%" : "—"}`
    ];

    // Сильные сигналы (бейджи)
    if (ma50 && ma200 && ma50 > ma200) parts.push("🟢 Golden Cross");
    if (ma50 && ma200 && ma50 < ma200) parts.push("🔴 Death Cross");
    if (rsi !== null && rsi < 30) parts.push("📉 Перепродан");
    if (rsi !== null && rsi > 70) parts.push("📈 Перекуплен");
    if (isFinite(vol1d) && vol1d > 200) parts.push("💎 Всплеск объёма");

    // Ручные фильтры
    if (filters?.minRSI && rsi !== null && rsi < Number(filters.minRSI)) continue;
    if (filters?.maxRSI && rsi !== null && rsi > Number(filters.maxRSI)) continue;
    if (filters?.minVolumeChange && isFinite(vol1d) && vol1d < Number(filters.minVolumeChange)) continue;
    if (filters?.maxVolumeChange && isFinite(vol1d) && vol1d > Number(filters.maxVolumeChange)) continue;
    if (filters?.maFilter) {
      const maMap: Record<string, number | null> = { "9": ma9, "21": ma21, "50": ma50, "200": ma200 };
      const sel = maMap[filters.maFilter];
      if (!sel || close < sel) continue; // требуем Цена > выбранной MA
    }

    // Быстрые пресеты
    if (filters?.quickSignal === "RSI_LOW" && !(rsi !== null && rsi < 30)) continue;
    if (filters?.quickSignal === "RSI_HIGH" && !(rsi !== null && rsi > 70)) continue;
    if (filters?.quickSignal === "VOLUME" && !(isFinite(vol1d) && vol1d > 200)) continue;
    if (filters?.quickSignal === "GOLDEN" && !(ma50 && ma200 && ma50 > ma200)) continue;
    if (filters?.quickSignal === "DEATH" && !(ma50 && ma200 && ma50 < ma200)) continue;

    signals.push(parts.join(" | "));
  }

  return res.status(200).json({ signals });
}
