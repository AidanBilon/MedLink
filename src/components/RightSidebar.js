// RightSidebar.jsx
import React, { useEffect, useState } from "react";

const RightSidebar = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false); // track completion

  useEffect(() => {
    const loadNews = async () => {
      try {
        // Use absolute URL in dev to avoid proxy confusion
        const endpoint =
          process.env.NODE_ENV === "development"
            ? "http://localhost:3001/api/medical-news?country=us&pageSize=10"
            : "/api/medical-news";

        const r = await fetch(endpoint);
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${r.statusText} ${text}`);
        }

        const data = await r.json();
        console.log("medical-news payload:", data);

        if (data?.status === "ok") {
          setArticles(Array.isArray(data.articles) ? data.articles.slice(0, 6) : []);
          setError("");
        } else {
          setError(data?.error ? `Server error: ${data.error}` : "Unknown response from news API.");
        }
      } catch (e) {
        console.error("loadNews error:", e);
        setError(`Network/parse error: ${e?.message || e}`);
      } finally {
        setLoaded(true);
      }
    };

    loadNews();
  }, []);

  return (
    <aside className="sidebar sidebar-right py-4 px-3">
      <h5 className="mb-3">Medical Updates</h5>
      <ul className="list-unstyled small mb-0">
        {!loaded && !error && <li>Loading latest news…</li>}
        {loaded && !error && articles.length === 0 && <li>No recent medical headlines found.</li>}
        {error && <li className="text-danger">{error}</li>}
        {articles.map((a, i) => (
          <li key={i} className="mb-2">
            <a href={a.url} target="_blank" rel="noopener noreferrer">
              {a.title}
            </a>
            <div className="text-muted">
              {(a.source && a.source.name) || "Unknown"}
              {a.publishedAt ? " · " + new Date(a.publishedAt).toLocaleString() : ""}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default RightSidebar;
