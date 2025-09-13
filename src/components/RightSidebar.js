import React, { useEffect, useState } from "react";

const RightSidebar = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const endpoint =
          process.env.NODE_ENV === "development"
            ? "http://localhost:3001/api/medical-news?country=us&pageSize=10"
            : "/api/medical-news";

        const r = await fetch(endpoint);
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        const data = await r.json();

        if (data?.status === "ok") {
          setArticles(Array.isArray(data.articles) ? data.articles.slice(0, 6) : []);
          setError("");
        } else {
          setError("Could not load news.");
        }
      } catch (e) {
        setError("Could not load news.");
      } finally {
        setLoaded(true);
      }
    };
    loadNews();
  }, []);

  return (
    <aside
      className="sidebar sidebar-right p-3 mb-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
      }}
    >
      <h5 className="mb-3" style={{ fontWeight: "600" }}>
        Recent Medical News
      </h5>
      <ul className="list-unstyled small mb-0">
        {!loaded && !error && <li>Loading latest news…</li>}
        {loaded && !error && articles.length === 0 && <li>No recent medical headlines found.</li>}
        {error && <li className="text-danger">{error}</li>}
        {articles.map((a, i) => (
          <li key={i} className="mb-3 pb-2 border-bottom" style={{ borderColor: "#f0f0f0" }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "500" }}>
              {a.title}
            </a>
            <div className="text-muted small mt-1">
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
