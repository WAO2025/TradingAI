// pages/index.tsx
import { useState } from "react";
import Papa from "papaparse";

// Тип строки из CSV
interface CsvRow {
  Date: string;
  Close: number;
  Volume: number;
  [key: string]: string | number;
}

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
    maFilter: "",   // 9, 21, 50, 200 — “Цена > MAx”
    quickSignal: "" // RSI_LOW | RSI_HIGH | VOLUME | GOLDEN | DEATH
  });

  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);

  const parseAndAnalyze = (rows: CsvRow[]) => {
    setStatusText("📊 Обработка данных...");
    setProgress(50);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, filters }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(data.signals || []);
        setStatusText("✅ Готово! Сигналы найдены.");
        setProgress(100);
        setLoading(false);
      })
      .catch(() => {
        setStatusText("❌ Ошибка анализа");
        setLoading(false);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusText("📥 Чтение файла...");
    setProgress(10);

    Papa.parse<CsvRow>(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = (results.data || []).filter(
          (r) => r && typeof r.Close === "number" && typeof r.Volume === "number"
        );
        setCsvData(rows);
        parseAndAnalyze(rows);
      },
    });
  };

  const applyFilters = () => {
    if (!csvData.length) return;
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: csvData, filters }),
    })
      .then((res) => res.json())
      .then((data) => setResult(data.signals || []));
  };

  const resetFilters = () => {
    setFilters({
      minRSI: "",
      maxRSI: "",
      minVolumeChange: "",
      maxVolumeChange: "",
      maFilter: "",
      quickSignal: ""
    });
    applyFilters();
  };

  const handleQuickFilter = (type: string) => {
    let newFilters = { ...filters };
    if (type === "RSI_LOW") {
      newFilters = { ...filters, minRSI: "", maxRSI: "30", quickSignal: "RSI_LOW" };
    } else if (type === "RSI_HIGH") {
      newFilters = { ...filters, minRSI: "70", maxRSI: "", quickSignal: "RSI_HIGH" };
    } else if (type === "VOLUME") {
      newFilters = { ...filters, minVolumeChange: "200", quickSignal: "VOLUME" };
    } else if (type === "GOLDEN") {
      newFilters = { ...filters, maFilter: "50", quickSignal: "GOLDEN" };
    } else if (type === "DEATH") {
      newFilters = { ...filters, maFilter: "50", quickSignal: "DEATH" };
    }
    setFilters(newFilters);
    setTimeout(applyFilters, 0);
  };

  const getActiveFiltersList = () => {
    const a: string[] = [];
    if (filters.minRSI) a.push(`RSI ≥ ${filters.minRSI}`);
    if (filters.maxRSI) a.push(`RSI ≤ ${filters.maxRSI}`);
    if (filters.minVolumeChange) a.push(`Объём ≥ ${filters.minVolumeChange}%`);
    if (filters.maxVolumeChange) a.push(`Объём ≤ ${filters.maxVolumeChange}%`);
    if (filters.maFilter) a.push(`Цена > MA${filters.maFilter}`);

    if (filters.quickSignal === "RSI_LOW") a.push("📉 RSI < 30");
    if (filters.quickSignal === "RSI_HIGH") a.push("📈 RSI > 70");
    if (filters.quickSignal === "VOLUME") a.push("💎 Объём > 200%");
    if (filters.quickSignal === "GOLDEN") a.push("🟢 Golden Cross");
    if (filters.quickSignal === "DEATH") a.push("🔴 Death Cross");
    return a;
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

  const disabled = !csvData.length;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", color: "white", backgroundColor: "#000", minHeight: "100vh" }}>
      <h1>📈 TradingAI — Анализ с фильтрами</h1>

      {/* Индикатор активных фильтров */}
      {getActiveFiltersList().length > 0 && (
        <div style={{ background: "#222", padding: "0.5rem 1rem", borderRadius: "6px", marginBottom: "1rem" }}>
          <strong>Активные фильтры:</strong> {getActiveFiltersList().join(" | ")}
        </div>
      )}

      {/* Быстрые фильтры */}
      <div style={{ marginBottom: "1rem" }}>
        <h3>Быстрые фильтры</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => handleQuickFilter("RSI_LOW")} disabled={disabled}>📉 RSI &lt; 30</button>
          <button onClick={() => handleQuickFilter("RSI_HIGH")} disabled={disabled}>📈 RSI &gt; 70</button>
          <button onClick={() => handleQuickFilter("VOLUME")} disabled={disabled}>💎 Объём &gt; 200%</button>
          <button onClick={() => handleQuickFilter("GOLDEN")} disabled={disabled}>🟢 Golden Cross</button>
          <button onClick={() => handleQuickFilter("DEATH")} disabled={disabled}>🔴 Death Cross</button>
        </div>
      </div>

      {/* Панель фильтров */}
      <div style={{ background: "#111", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
        <h3>Фильтры</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input placeholder="min RSI" value={filters.minRSI} onChange={(e) => setFilters({ ...filters, minRSI: e.target.value })} disabled={disabled} />
          <input placeholder="max RSI" value={filters.maxRSI} onChange={(e) => setFilters({ ...filters, maxRSI: e.target.value })} disabled={disabled} />
          <input placeholder="min Volume %" value={filters.minVolumeChange} onChange={(e) => setFilters({ ...filters, minVolumeChange: e.target.value })} disabled={disabled} />
          <input placeholder="max Volume %" value={filters.maxVolumeChange} onChange={(e) => setFilters({ ...filters, maxVolumeChange: e.target.value })} disabled={disabled} />
          <select value={filters.maFilter} onChange={(e) => setFilters({ ...filters, maFilter: e.target.value })} disabled={disabled}>
            <option value="">MA фильтр</option>
            <option value="9">MA 9</option>
            <option value="21">MA 21</option>
            <option value="50">MA 50</option>
            <option value="200">MA 200</option>
          </select>
          <button onClick={applyFilters} disabled={disabled}>Применить</button>
          <button onClick={resetFilters} disabled={disabled}>Сброс</button>
        </div>
      </div>

      <input type="file" accept=".csv" onChange={handleFileUpload} />

      <div style={{ marginTop: "1rem" }}>
        <p>{statusText}</p>
        {loading && (
          <div style={{ height: "20px", width: "100%", backgroundColor: "#333", borderRadius: "10px", overflow: "hidden", marginTop: "0.5rem" }}>
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
            <p key={idx} style={{ margin: "0.3rem 0" }}>{msg}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
