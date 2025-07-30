import { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [result, setResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(results.data),
        })
          .then((res) => res.json())
          .then((data) => {
            setResult(data.signals);
            setLoading(false);
          });
      },
    });
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>📈 TradingAI — CSV анализ объёма</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {loading && <p>⏳ Анализируем...</p>}
      <ul>
        {result.map((r, idx) => (
          <li key={idx}>{r}</li>
        ))}
      </ul>
    </main>
  );
}

