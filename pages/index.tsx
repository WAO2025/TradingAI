// pages/index.tsx
import { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [result, setResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Ожидание файла...");
  const [progress, setProgress] = useState(0);
  const [filters, setFilters] = useState({
    minRSI: "",
    maxRSI: "",
    minVolumeChange: "",
    maxVolumeChange: "",
    maFilter: "", // 9, 21, 50, 200
  });

  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);

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
        setCsvData(results.data);
        setStatusText("📊 Обработка данных...");
        setProgress(50);

        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: results.data, filters }),
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

  const applyFilters = () => {
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: csvData, filters }),
    })
      .then((res) => res.json())
      .then((data) => setResult(data.signals));
  };

  const resetFilters = () => {
    setFilters({ minRSI: "", maxRSI: "", minVolumeChange: "", maxVolumeChange: "", maFilter: "" });
    applyFilters();
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = `🧠 ${chatInput}`;
    const updatedResponse = [...chatResponse, userMessage];
    setChatResponse(updatedResponse);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          history: updatedResponse.map((msg) => ({
            role: msg.startsWith("🧠") ? "user" : "assistant",
            content: msg.replace(/^🧠 |^💬 /, ""),
          })),
          context: result.join("\n"),
        }),
      });

      const data = await response.json();
      setChatResponse((prev) => [...prev, `💬 ${data.reply}`]);
    } catch {
      setChatResponse((prev) => [...prev, "❌ Ошибка при обращении к API"]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", color: "white", backgroundColor: "#000", minHeight: "100vh" }}>
      <h1>📈 TradingAI — Анализ с фильтрами</h1>

      {/* Панель фильтров */}
      <div style={{ background: "#111", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
        <h3>Фильтры</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input placeholder="min RSI" value={filters.minRSI} onChange={(e) => setFilters({ ...filters, minRSI: e.target.value })} />
          <input placeholder="max RSI" value={filters.maxRSI} onChange={(e) => setFilters({ ...filters, maxRSI: e.target.value })} />
          <input placeholder="min Volume %" value={filters.minVolumeChange} onChange={(e) => setFilters({ ...filters, minVolumeChange: e.target.value })} />
          <input placeholder="max Volume %" value={filters.maxVolumeChange} onChange={(e) => setFilters({ ...filters, maxVolumeChange: e.target.value })} />
          <select value={filters.maFilter} onChange={(e) => setFilters({ ...filters, maFilter: e.target.value })}>
            <option value="">MA фильтр</option>
            <option value="9">MA 9</option>
            <option value="21">MA 21</option>
            <option value="50">MA 50</option>
            <option value="200">MA 200</option>
          </select>
          <button onClick={applyFilters}>Применить</button>
          <button onClick={resetFilters}>Сброс</button>
        </div>
      </div>

      <input type="file" accept=".csv" onChange={handleFileUpload} />

      <div style={{ marginTop: "1rem" }}>
        <p>{statusText}</p>
        {loading && (
          <div style={{ height: "20px", width: "100%", backgroundColor: "#333", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#4caf50", transition: "width 0.5s ease-in-out" }} />
          </div>
        )}
      </div>

      <ul style={{ marginTop: "1rem" }}>
        {result.map((r, idx) => (
          <li key={idx}>{r}</li>
        ))}
      </ul>

      {/* Чат */}
      <div style={{ marginTop: "3rem", borderTop: "1px solid #444", paddingTop: "1rem" }}>
        <h2>💬 Командный чат</h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input style={{ flex: 1 }} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Например: Найди RSI < 30" />
          <button onClick={handleChatSubmit} disabled={chatLoading}>{chatLoading ? "⏳..." : "Отправить"}</button>
        </div>
        <div style={{ maxHeight: "300px", overflowY: "auto", background: "#111", padding: "1rem", borderRadius: "8px" }}>
          {chatResponse.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
