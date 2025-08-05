import type { NextApiRequest, NextApiResponse } from "next";

interface Row {
  Date: string;
  Volume: number;
  [key: string]: string | number;
}


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rows: Row[] = req.body;

  if (!Array.isArray(rows)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const signals: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];

    if (!prev.Volume || !curr.Volume) continue;

    const volumeGrowth1d = ((curr.Volume - prev.Volume) / prev.Volume) * 100;

    // Среднее за 5 дней до текущей
    const start5d = Math.max(0, i - 5);
    const avg5d =
      rows.slice(start5d, i).reduce((sum, r) => sum + (typeof r.Volume === "number" ? r.Volume : 0), 0) /
      (i - start5d || 1);

    const volumeGrowth5d = ((curr.Volume - avg5d) / avg5d) * 100;

    // Среднее за 21 день до текущей
    const start21d = Math.max(0, i - 21);
    const avg21d =
      rows.slice(start21d, i).reduce((sum, r) => sum + (typeof r.Volume === "number" ? r.Volume : 0), 0) /
      (i - start21d || 1);

    const volumeGrowth21d = ((curr.Volume - avg21d) / avg21d) * 100;

    // Цветовая логика по росту за 1 день
    let color = "";
    if (volumeGrowth1d >= 300) color = "🟩";
    else if (volumeGrowth1d >= 150) color = "🟨";
    else if (volumeGrowth1d >= 100) color = "🟥";

    if (color) {
      signals.push(
        `${color} ${curr.Date}: объём вырос на ${volumeGrowth1d.toFixed(1)}% (1д), ${volumeGrowth5d.toFixed(
          1
        )}% (5д), ${volumeGrowth21d.toFixed(1)}% (21д)`
      );
    }
  }

  res.status(200).json({ signals });
}
