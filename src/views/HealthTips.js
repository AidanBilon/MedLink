import React, { useEffect, useState } from "react";
import { Container } from "reactstrap";
import MedLinkBackground from "../assets/MedLink_Background.png"; // adjust path if needed
import WhoLogo from "../assets/who-logo.png";
import GovCanLogo from "../assets/gov-can-logo.png";

export default function HealthTips() {
  const [featured, setFeatured] = useState(null);
  const [food, setFood] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [whoRes, foodRes] = await Promise.all([
          fetch("/api/featured-health"),
          fetch("/api/featured-food"),
        ]);
        if (!whoRes.ok) throw new Error(await whoRes.text());
        if (!foodRes.ok) throw new Error(await foodRes.text());
        setFeatured(await whoRes.json());
        setFood(await foodRes.json());
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  const BackgroundWrapper = ({ children }) => (
    <div
      style={{
  backgroundImage: `url(${MedLinkBackground})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundColor: '#ffffff',
        minHeight: "100vh",
        paddingTop: "2rem",
        paddingBottom: "2rem",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, background: 'transparent', borderRadius: 12 }}>
        {children}
      </div>
    </div>
  );

  if (err) {
    return (
      <BackgroundWrapper>
        <Container>
          <p style={{ color: "#b00020" }}>Error: {err}</p>
        </Container>
      </BackgroundWrapper>
    );
  }

  if (!featured || !food) {
    return (
      <BackgroundWrapper>
        <Container>
          <p>Loading…</p>
        </Container>
      </BackgroundWrapper>
    );
  }

  const ArticleCard = ({ children, logo, logoAlt, logoBox }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* left content */}
      <div style={{ flex: 1, paddingRight: 8, minWidth: 0 }}>{children}</div>

      {/* right logo */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: logoBox.width,
          height: logoBox.height,
        }}
      >
        <img
          src={logo}
          alt={logoAlt || "logo"}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );

  return (
    <BackgroundWrapper>
      <Container>
        <h1>Health and Wellness</h1>

        {/* WHO Article */}
        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <ArticleCard
            logo={WhoLogo}
            logoAlt="World Health Organization"
            logoBox={{ width: 200, height: 90 }} // WHO stays big
          >
            {featured.image && (
              <img
                src={featured.image}
                alt=""
                style={{
                  width: "100%",
                  height: 260,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                color: "#6b7280",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                WHO • Feature story
              </span>
              <time dateTime={featured.published}>
                {new Date(featured.published).toLocaleDateString()}
              </time>
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                margin: "4px 0 6px",
              }}
            >
              {featured.title}
            </h2>

            {featured.description && (
              <p style={{ color: "#374151", margin: 0 }}>
                {featured.description}
              </p>
            )}

            <p
              style={{
                color: "#1d4ed8",
                marginTop: 10,
                fontSize: 14,
              }}
            >
              Read on who.int →
            </p>
          </ArticleCard>
        </a>

        {/* Canada Food Guide Article */}
        <a
          href={food.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <ArticleCard
            logo={GovCanLogo}
            logoAlt="Government of Canada"
            logoBox={{ width: 180, height: 80 }} // GovCan made slightly bigger
          >
            {food.image && (
              <img
                src={food.image}
                alt=""
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                color: "#6b7280",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                Canada • Food Guide
              </span>
              <time dateTime={food.published}>
                {new Date(food.published).toLocaleDateString()}
              </time>
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                margin: "4px 0 6px",
              }}
            >
              {food.title}
            </h2>

            {food.description && (
              <p style={{ color: "#374151", margin: 0 }}>
                {food.description}
              </p>
            )}

            <p
              style={{
                color: "#1d4ed8",
                marginTop: 10,
                fontSize: 14,
              }}
            >
              Read on food-guide.canada.ca →
            </p>
          </ArticleCard>
        </a>

        <div style={{ height: 48 }} />
      </Container>
    </BackgroundWrapper>
  );
}
