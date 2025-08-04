// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { prompt, history = [] } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "Missing OpenAI API key" });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        ...history,
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (data.error) {
    return res.status(500).json({ message: data.error.message });
  }

  const reply = data.choices?.[0]?.message?.content || "Нет ответа.";

  res.status(200).json({ reply });
}
