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
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatInput }),
    });
    const data = await response.json();
    setChatResponse([...chatResponse, `🧠 ${chatInput}`, `💬 ${data.reply}`]);
    setChatInput("");
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>📈 TradingAI — CSV анализ объёма</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <div style={{ marginTop: "1rem" }}>
        <p>{statusText}</p>
        {loading && (
          <div
            style={{
              height: "20px",
              width: "100%",
              backgroundColor: "#ddd",
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

      <div style={{ marginTop: "3rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
        <h2>💬 Командный чат</h2>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Например: Найди рост > 200%"
          style={{ width: "80%", marginRight: "1rem" }}
        />
        <button onClick={handleChatSubmit}>Отправить</button>
        <div style={{ marginTop: "1rem" }}>
          {chatResponse.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
