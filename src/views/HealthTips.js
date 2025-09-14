import React, { useEffect, useState } from "react";
import { Container } from "reactstrap";

export default function HealthTips() {
  const [featured, setFeatured] = useState(null);
  const [food, setFood] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [whoRes, foodRes] = await Promise.all([
          fetch("/api/featured-health"),
          fetch("/api/featured-food")
        ]);
        if (!whoRes.ok) throw new Error(await whoRes.text());
        if (!foodRes.ok) throw new Error(await foodRes.text());
        const whoData = await whoRes.json();
        const foodData = await foodRes.json();
        setFeatured(whoData);
        setFood(foodData);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  if (err) return <Container className="mt-5"><p style={{color:"#b00020"}}>Error: {err}</p></Container>;
  if (!featured || !food) return <Container className="mt-5"><p>Loading…</p></Container>;

  return (
    <Container className="mt-5">
      <h1>Health and Wellness</h1>

      {/* WHO Article */}
      <a
        href={featured.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            marginTop: 16,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
        >
          {featured.image ? (
            <img
              src={featured.image}
              alt=""
              style={{
                width: "100%",
                height: 260,
                objectFit: "cover",
                borderRadius: 12,
                marginBottom: 12
              }}
            />
          ) : null}

          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#6b7280", fontSize: 12, marginBottom: 6 }}>
            <span style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 8px" }}>
              WHO • Feature story
            </span>
            <time dateTime={featured.published}>
              {new Date(featured.published).toLocaleDateString()}
            </time>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 600, margin: "4px 0 6px" }}>
            {featured.title}
          </h2>

          {featured.description ? (
            <p style={{ color: "#374151", margin: 0 }}>{featured.description}</p>
          ) : null}

          <p style={{ color: "#1d4ed8", marginTop: 10, fontSize: 14 }}>
            Read on who.int →
          </p>
        </div>
      </a>

      {/* Canada Food Guide Article */}
      <a
        href={food.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            marginTop: 24,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
        >
          {food.image ? (
            <img
              src={food.image}
              alt=""
              style={{
                width: "100%",
                height: 220,
                objectFit: "cover",
                borderRadius: 12,
                marginBottom: 12
              }}
            />
          ) : null}

          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#6b7280", fontSize: 12, marginBottom: 6 }}>
            <span style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 8px" }}>
              Canada • Food Guide
            </span>
            <time dateTime={food.published}>
              {new Date(food.published).toLocaleDateString()}
            </time>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 600, margin: "4px 0 6px" }}>
            {food.title}
          </h2>

          {food.description ? (
            <p style={{ color: "#374151", margin: 0 }}>{food.description}</p>
          ) : null}

          <p style={{ color: "#1d4ed8", marginTop: 10, fontSize: 14 }}>
            Read on food-guide.canada.ca →
          </p>
        </div>
      </a>
      <div style={{ height: 48 }} />
    </Container>
  );
}
