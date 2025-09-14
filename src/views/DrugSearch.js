import React, { useMemo, useState } from "react";
import { Container, Input, Button, Form, FormGroup, Label, Badge, Alert } from "reactstrap";

export default function DrugSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [strategy, setStrategy] = useState(null); // "exact" | "closest" | "default"
  const [usedDefaultTerm, setUsedDefaultTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // paging
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const skip = useMemo(() => page * limit, [page, limit]);

  const total = meta?.results?.total ?? 0;
  const hasPrev = page > 0;
  const hasNext = skip + limit < total;

  const buildEndpoint = (q, lmt, skp) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    params.set("limit", String(lmt));
    params.set("skip", String(skp));
    return process.env.NODE_ENV === "development"
      ? `http://localhost:3001/api/fda/drug-label?${params.toString()}`
      : `/api/fda/drug-label?${params.toString()}`;
  };

  const fetchPage = async (targetPage = 0) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = buildEndpoint(query, limit, targetPage * limit);
      const res = await fetch(endpoint);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      setResults(data.results || []);
      setMeta(data.meta || null);
      setStrategy(data.strategy || null);
      setUsedDefaultTerm(data.usedDefaultTerm || null);
      setPage(targetPage);
    } catch (err) {
      setResults([]);
      setMeta(null);
      setStrategy(null);
      setUsedDefaultTerm(null);
      setError(err.message || "No results found or API error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await fetchPage(0);
  };

  const onChangeLimit = async (e) => {
    const newLimit = Math.max(1, Math.min(50, Number(e.target.value) || 10));
    setLimit(newLimit);
    if (query.trim()) {
      setPage(0);
      await fetchPage(0);
    }
  };

  const hintBanner = () => {
    if (strategy === "closest") {
      return (
        <Alert color="info" className="mt-2">
          No exact matches for <strong>{query}</strong>. Showing the closest available results.
        </Alert>
      );
    }
    if (strategy === "default" && usedDefaultTerm) {
      return (
        <Alert color="secondary" className="mt-2">
          No matches for <strong>{query}</strong>. Showing a default set for <strong>{usedDefaultTerm}</strong> so you can still browse an example label.
        </Alert>
      );
    }
    return null;
    };

  return (
    <Container style={{ maxWidth: 920, marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="mb-0">FDA Drug Search</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Button color="secondary" tag="a" href="https://www.fda.gov/" target="_blank" rel="noreferrer">
            Go to FDA website
          </Button>
          <Button color="secondary" tag="a" href="https://www.hhs.gov/" target="_blank" rel="noreferrer">
            Go to HHS website
          </Button>
        </div>
      </div>

      <p className="text-muted" style={{ marginTop: 8 }}>
        Search the FDA drug database (openFDA) to find prescription drug information. Data is public and not validated for clinical use.
      </p>

      <Form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <FormGroup>
          <Label for="drugQuery">Drug Name or Active Ingredient</Label>
          <Input
            id="drugQuery"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Amoxicillin, Ibuprofen, Atorvastatin"
            required
          />
        </FormGroup>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Button color="primary" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Label htmlFor="limit" className="mb-0">Results per page</Label>
            <Input id="limit" type="select" value={limit} onChange={onChangeLimit} style={{ width: 96 }}>
              {[5, 10, 20, 30, 40, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Input>
          </div>

          {meta?.results?.total > 0 && (
            <Badge pill color="light" className="text-muted">
              {meta.results.total.toLocaleString()} results
            </Badge>
          )}
        </div>
      </Form>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {hintBanner()}

      {results.length > 0 && (
        <div>
          {/* Top pager */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h5 className="mb-0">Results</h5>
            <div style={{ display: "flex", gap: 8 }}>
              <Button color="light" disabled={page <= 0 || loading} onClick={() => fetchPage(page - 1)}>
                ← Prev
              </Button>
              <Button color="light" disabled={skip + limit >= (meta?.results?.total || 0) || loading} onClick={() => fetchPage(page + 1)}>
                Next →
              </Button>
            </div>
          </div>

          {results.map((drug, idx) => (
            <div
              key={drug.id || idx}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h4 style={{ marginBottom: 4 }}>
                    {drug.openfda?.brand_name?.join(", ") ||
                      drug.openfda?.generic_name?.join(", ") ||
                      "Unknown Brand"}
                  </h4>
                  <div className="text-muted">
                    <strong>Generic:</strong> {drug.openfda?.generic_name?.join(", ") || "N/A"} &nbsp;•&nbsp;
                    <strong>Manufacturer:</strong> {drug.openfda?.manufacturer_name?.join(", ") || "N/A"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {drug.openfda?.product_type?.[0] && (
                    <Badge color="info">{drug.openfda.product_type[0]}</Badge>
                  )}
                  {drug.openfda?.route?.length ? (
                    <Badge color="secondary">{drug.openfda.route.join(", ")}</Badge>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <p style={{ marginBottom: 8 }}>
                  <strong>Purpose:</strong> {drug.purpose?.join(" ") || "N/A"}
                </p>
                <details>
                  <summary style={{ cursor: "pointer" }}>More info</summary>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    <p><strong>Indications & Usage:</strong> {drug.indications_and_usage?.join(" ") || "N/A"}</p>
                    <p><strong>Warnings:</strong> {drug.warnings?.join(" ") || "N/A"}</p>
                    <p><strong>Dosage & Administration:</strong> {drug.dosage_and_administration?.join(" ") || "N/A"}</p>
                    <p><strong>Active Ingredients:</strong> {drug.active_ingredient?.join(", ") || "N/A"}</p>
                    <p><strong>Inactive Ingredients:</strong> {drug.inactive_ingredient?.join(", ") || "N/A"}</p>
                    <p><strong>FDA Application #:</strong> {drug.openfda?.application_number?.join(", ") || "N/A"}</p>
                    <p>
                      <strong>NDCs:</strong>{" "}
                      {drug.openfda?.packaging?.map((p) => p?.ndc).filter(Boolean).join(", ") ||
                        drug.openfda?.product_ndc?.join(", ") ||
                        "N/A"}
                    </p>
                  </div>
                </details>
              </div>
            </div>
          ))}

          {/* Bottom pager */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div className="text-muted">
              {meta?.results?.total > 0
                ? `Showing ${skip + 1}-${Math.min(skip + limit, meta.results.total)} of ${meta.results.total.toLocaleString()}`
                : "No results"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button color="light" disabled={page <= 0 || loading} onClick={() => fetchPage(page - 1)}>
                ← Prev
              </Button>
              <Button color="light" disabled={skip + limit >= (meta?.results?.total || 0) || loading} onClick={() => fetchPage(page + 1)}>
                Next →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div style={{ border: "1px dashed #e5e7eb", borderRadius: 16, padding: 20, background: "#fafafa" }}>
          <p className="mb-2"><strong>No results.</strong> Try a broader term or an advanced query like <code>purpose:"pain relief"</code> or <code>drug_interactions:caffeine</code>.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Amoxicillin", "Ibuprofen", "Acetaminophen", "Metformin"].map((ex) => (
              <Button key={ex} size="sm" color="light" onClick={() => setQuery(ex)}>
                {ex}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
