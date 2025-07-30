import type { NextApiRequest, NextApiResponse } from "next";

interface Row {
  Date: string;
  Volume: number;
  [key: string]: any;
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

    const volumeGrowth = ((curr.Volume - prev.Volume) / prev.Volume) * 100;

    if (volumeGrowth > 100) {
      signals.push(
        `📊 ${curr.Date || "Дата не указана"} — объём вырос на ${volumeGrowth.toFixed(1)}%`
      );
    }
  }

  res.status(200).json({ signals });
}

