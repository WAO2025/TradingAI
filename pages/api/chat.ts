// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Missing or invalid message" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "Missing OpenAI API key" });
  }

  try {
    console.log("🔐 KEY EXISTS:", !!process.env.OPENAI_API_KEY);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [...history, { role: "user", content: message }],
        temperature: 0.7,
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI error:", data.error);
      return res.status(500).json({ message: data.error.message });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ message: "OpenAI не вернул ответ." });
    }

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Ошибка сервера." });
  }
}
