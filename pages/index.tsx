// pages/index.tsx
import { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [result, setResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Ожидание файла...");
  const [progress, setProgress] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusText("📥 Чтение файла...");
    setProgress(10);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        setStatusText("📊 Обработка данных...");
        setProgress(50);

        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(results.data),
        })
          .then((res) => res.json())
          .then((data) => {
            setResult(data.signals);
            setStatusText("✅ Готово! Сигналы найдены.");
            setProgress(100);
            setLoading(false);
          });
      },
    });
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = `🧠 ${chatInput}`;
    const updatedResponse = [...chatResponse, userMessage];
    setChatResponse(updatedResponse);
    setChatInput("");
    setChatLoading(true);

    // Преобразуем в формат [{ role, content }]
    const messages = updatedResponse.map((msg) => ({
      role: msg.startsWith("🧠") ? "user" : "assistant",
      content: msg.replace(/^🧠 |^💬 /, ""),
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          history: messages,
          context: result.join("\n"),
        }),
      });

      const data = await response.json();
      const botMessage = `💬 ${data.reply}`;
      setChatResponse((prev) => [...prev, botMessage]);
    } catch (error) {
      setChatResponse((prev) => [...prev, "❌ Ошибка при обращении к API"]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", color: "white", backgroundColor: "#000", minHeight: "100vh" }}>
      <h1>📈 TradingAI — CSV анализ объёма</h1>

      <input type="file" accept=".csv" onChange={handleFileUpload} />

      <div style={{ marginTop: "1rem" }}>
        <p>{statusText}</p>
        {loading && (
          <div
            style={{
              height: "20px",
              width: "100%",
              backgroundColor: "#333",
              borderRadius: "10px",
              overflow: "hidden",
              marginTop: "0.5rem",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#4caf50",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        )}
      </div>

      <ul style={{ marginTop: "1rem" }}>
        {result.map((r, idx) => (
          <li key={idx}>{r}</li>
        ))}
      </ul>

      <div style={{ marginTop: "3rem", borderTop: "1px solid #444", paddingTop: "1rem" }}>
        <h2>💬 Командный чат</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Например: Найди рост > 200%"
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor: "#111",
              color: "white",
              border: "1px solid #555",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleChatSubmit}
            disabled={chatLoading}
            style={{
              backgroundColor: "#4caf50",
              border: "none",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {chatLoading ? "⏳..." : "Отправить"}
          </button>
        </div>
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            background: "#111",
            color: "white",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #333",
          }}
        >
          {chatResponse.map((msg, idx) => (
            <p key={idx} style={{ margin: "0.3rem 0" }}>{msg}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
