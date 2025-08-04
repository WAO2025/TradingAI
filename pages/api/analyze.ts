import type { NextApiRequest, NextApiResponse } from "next";

interface Row {
  Date: string;
  Volume: number;
  [key: string]: string | number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rows: Row[] = req.body;

  if (!Array.isArray(rows)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const signals: string[] = [];

  // Соберём все объёмы для расчёта среднего
  const allVolumes = rows.map((row) => row.Volume).filter((v) => typeof v === "number") as number[];
  const avgVolume = allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];

    if (!prev.Volume || !curr.Volume) continue;

    const volumeGrowth = ((curr.Volume - prev.Volume) / prev.Volume) * 100;
    const comparedToAvg = ((curr.Volume - avgVolume) / avgVolume) * 100;

    // Цветовая логика
    let color = "";
    if (volumeGrowth >= 300) color = "🟥";
    else if (volumeGrowth >= 150) color = "🟨";
    else if (volumeGrowth >= 100) color = "🟩";

    if (color) {
      signals.push(
        `${color} ${curr.Date}: объём вырос на ${volumeGrowth.toFixed(1)}% (среднее = ${comparedToAvg.toFixed(1)}%)`
      );
    }
  }

  res.status(200).json({ signals });
}
