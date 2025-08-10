// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { message, history = [], context = "" } = (req.body ?? {}) as {
    message?: string;
    history?: Array<{ role?: string; content?: string }>;
    context?: string;
  };

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Missing or invalid message" });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Нет ключа OPENAI_API_KEY");
    return res.status(500).json({ message: "Missing OpenAI API key" });
  }

  try {
    // Безопасно нормализуем историю (только role/content нужных типов)
    const historySafe: Msg[] = Array.isArray(history)
      ? history
          .map((m) => {
            const role = (m.role === "user" || m.role === "assistant" || m.role === "system") ? m.role : "user";
            const content = typeof m.content === "string" ? m.content : "";
            return { role, content } as Msg;
          })
          .filter((m) => m.content.trim().length > 0)
      : [];

    const systemPrompt =
      context && typeof context === "string" && context.trim().length > 0
        ? `Вот список сигналов из CSV. Отвечай только по нему:

${context}`
        : "Ты ассистент по анализу сигналов. Отвечай строго по данным пользователя.";

    const messages: Msg[] = [
      { role: "system", content: systemPrompt },
      ...historySafe,
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = (data && (data.error?.message || data.message)) || `OpenAI HTTP ${response.status}`;
      console.error("⚠️ Ошибка от OpenAI:", errMsg);
      return res.status(500).json({ message: errMsg });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error("⚠️ OpenAI не вернул reply:", data);
      return res.status(500).json({ message: "OpenAI не вернул ответ." });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("💥 Ошибка сервера:", error);
    return res.status(500).json({ message: "Ошибка сервера." });
  }
}
