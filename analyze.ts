import type { NextApiRequest, NextApiResponse } from 'next';

type Candle = {
  Date: string;
  Close: number;
  Volume: number;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const data: Candle[] = req.body;

  const signals: string[] = [];

  for (let i = 5; i < data.length; i++) {
    const avgVol =
      (data[i - 1].Volume + data[i - 2].Volume + data[i - 3].Volume + data[i - 4].Volume + data[i - 5].Volume) / 5;

    if (data[i].Volume > avgVol * 1.5) {
      signals.push(
        `📌 ${data[i].Date}: Объём вырос на +${Math.round((data[i].Volume / avgVol - 1) * 100)}%`
      );
    }
  }

  res.status(200).json({ signals });
}
