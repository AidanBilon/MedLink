require('dotenv').config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { GoogleGenAI } = require("@google/genai");
const bodyParser = require("body-parser");
const { auth } = require("express-oauth2-jwt-bearer");
const authConfig = require("./src/auth_config.json");

const app = express();

const port = process.env.API_PORT || 3001;
const appPort = process.env.SERVER_PORT || 3000;
const appOrigin = authConfig.appOrigin || `http://localhost:${appPort}`;

const cheerio = require("cheerio");
// Use dynamic import for node-fetch in CommonJS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const OPENFDA_BASE = "https://api.fda.gov";

if (
  (!authConfig.domain || !authConfig.audience || authConfig.audience === "{yourApiIdentifier}") &&
  process.env.ALLOW_UNAUTH_TRIAGE !== 'true'
) {
  console.log(
    "Exiting: Please make sure that auth_config.json is in place and populated with valid domain and audience values (or set ALLOW_UNAUTH_TRIAGE=true for public triage dev mode)"
  );
  process.exit();
} else if (authConfig.audience === "{yourApiIdentifier}" && process.env.ALLOW_UNAUTH_TRIAGE === 'true') {
  console.warn('Starting in UNAUTH TRIAGE DEV MODE (no valid audience). Secured /api/triage disabled; use /api/triage/public.');
}

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: appOrigin }));

const checkJwt = auth({
  audience: authConfig.audience,
  issuerBaseURL: `https://${authConfig.domain}/`,
  algorithms: ["RS256"],
});

app.use(bodyParser.json({ limit: '1mb' }));

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not set. Triage endpoints will fail until provided.');
} else {
  const masked = process.env.GEMINI_API_KEY.length <= 8 ? '***' : `${process.env.GEMINI_API_KEY.slice(0,4)}***${process.env.GEMINI_API_KEY.slice(-4)}`;
  console.log(`Gemini key detected (masked): ${masked}`);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing-key' });

app.post('/api/triage', checkJwt, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message (string) required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'missing_gemini_key' });
    }

    // Guardrail: reject non-medical queries quickly
    const guardPrompt = `Determine if the following user input is about medical symptoms, injury, or acute health concerns.
Return ONLY yes or no.
Input: ${message}`;
    const guard = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: guardPrompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    const guardText = (guard.text || '').trim().toLowerCase();
    if (!guardText.startsWith('y')) {
      return res.json({ refused: true, reason: 'Non-triage domain', advice: 'Please provide medical symptoms or concerns for triage assistance.' });
    }

    const triagePrompt = `You are a medical triage assistant (not a doctor). Task:
1. Summarize key symptoms.
2. Provide immediate self-care advice (e.g., apply ice, elevate, hydration) if appropriate.
3. Propose a severity ranking: one of Minimal, Mild, Moderate, Concerning, Critical.
4. Estimate when the patient is likely to be seen in a busy ER (range) – but ALWAYS advise going as soon as possible or calling emergency services (911) and clarify this is not a diagnosis.
5. Output structured JSON with keys: symptomsSummary, advice, severity, estimatedERWait, disclaimer.
User input: ${message}

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: triagePrompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });

    let text = response.text || '';
    // Attempt to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'LLM response not JSON', raw: text });
    }
    let data;
    try { data = JSON.parse(jsonMatch[0]); } catch (e) {
      return res.status(502).json({ error: 'Invalid JSON from model', raw: text });
    }
    // Enforce disclaimer addition
    data.disclaimer = 'This is not a diagnosis. If you believe this may be an emergency call 911 or go to the nearest emergency department immediately.';
    return res.json(data);
  } catch (err) {
    console.error('triage error', err);
    const status = err?.response?.status || 500;
    return res.status(status).json({ error: 'triage_failed', detail: err.message });
  }
});

// Optional unauthenticated triage (development / fallback). Enable by setting ALLOW_UNAUTH_TRIAGE=true
if (process.env.ALLOW_UNAUTH_TRIAGE === 'true') {
  console.log('WARNING: Unauthenticated triage endpoint enabled. Do not use in production without safeguards.');
  app.post('/api/triage/public', async (req, res) => {
    try {
      const { message } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message (string) required' });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'missing_gemini_key' });
      }
      const guardPrompt = `Determine if the following user input is about medical symptoms, injury, or acute health concerns.\nReturn ONLY yes or no.\nInput: ${message}`;
      const guard = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: guardPrompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });
      const guardText = (guard.text || '').trim().toLowerCase();
      if (!guardText.startsWith('y')) {
        return res.json({ refused: true, reason: 'Non-triage domain', advice: 'Please provide medical symptoms or concerns.' });
      }
      const triagePrompt = `You are a medical triage assistant (not a doctor). Task:\n1. Summarize key symptoms.\n2. Provide immediate self-care advice.\n3. Propose severity: Minimal, Mild, Moderate, Concerning, Critical.\n4. Estimate likely ER wait (range) BUT ALWAYS advise going ASAP or calling 911.\n5. Output JSON keys: symptomsSummary, advice, severity, estimatedERWait, disclaimer.\nUser input: ${message}\nReturn ONLY JSON.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: triagePrompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
      });
      let text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(502).json({ error: 'LLM response not JSON', raw: text });
      let data; try { data = JSON.parse(jsonMatch[0]); } catch(e){ return res.status(502).json({ error:'Invalid JSON from model', raw: text }); }
      data.disclaimer = 'This is not a diagnosis. If you believe this may be an emergency call 911 or go to the nearest emergency department immediately.';
      return res.json(data);
    } catch (err) {
      console.error('triage public error', err);
      const status = err?.response?.status || 500;
      return res.status(status).json({ error: 'triage_failed', detail: err.message });
    }
  });
}

app.get("/api/external", checkJwt, (req, res) => {
  res.send({
    msg: "Your access token was successfully validated!",
  });
});

// --- NewsAPI setup ---
const NewsAPI = require('newsapi');

// trim to avoid accidental whitespace issues
const NEWS_API_KEY = (process.env.MEDICAL_NEWS_API_KEY || '').trim();
if (!NEWS_API_KEY) {
  console.warn('MEDICAL_NEWS_API_KEY not set. /api/medical-news will return 500 until provided.');
}
const newsapi = new NewsAPI(NEWS_API_KEY);

// in-memory cache (per-parameter) for 5 minutes
const NEWS_CACHE_MS = 5 * 60 * 1000;
const newsCache = new Map();
// --- Medical news endpoint with smart fallback ---
app.get('/api/medical-news', async (req, res) => {
  try {
    if (!NEWS_API_KEY) {
      return res.status(500).json({ error: 'missing_news_key' });
    }

    const {
      q,
      country = 'us',        // default to US (more results)
      language = 'en',
      pageSize = 10,
      category = 'health'    // allow clearing via ?category=
    } = req.query || {};

    const pageCount = Math.min(Number(pageSize) || 10, 50);

    // cache key depends on effective params
    const cacheKey = JSON.stringify({ q: q || '', country, language, pageCount, category: category ?? 'none' });
    const now = Date.now();
    const cached = newsCache.get(cacheKey);
    if (cached && (now - cached.ts) < NEWS_CACHE_MS) {
      return res.json(cached.data);
    }

    // 1) Try top-headlines first (category optional)
    const topParams = {
      language,
      pageSize: pageCount,
      q: q || undefined,
      ...(category ? { category } : {}),
      ...(country ? { country } : {})
    };

    let resp = await newsapi.v2.topHeadlines(topParams);

    // 2) If empty and not already US, try US (often more content)
    if ((resp.totalResults || 0) === 0 && country !== 'us' && !req.query.sources) {
      resp = await newsapi.v2.topHeadlines({ ...topParams, country: 'us' });
    }

    // 3) If still empty, fallback to /everything (last 7 days) with broad medical query
    if ((resp.totalResults || 0) === 0) {
      const toISO = new Date();
      const fromISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const fallbackQuery = (q && q.trim())
        ? q
        : '(health OR medicine OR hospital OR emergency OR ER OR cardiology OR oncology OR clinical OR physician OR nursing)';

      resp = await newsapi.v2.everything({
        q: fallbackQuery,
        language,
        from: fromISO.toISOString().slice(0, 10),
        to: toISO.toISOString().slice(0, 10),
        sortBy: 'publishedAt',
        pageSize: pageCount,
      });
    }

    // only cache non-empty results
    if ((resp.totalResults || 0) > 0) {
      newsCache.set(cacheKey, { ts: now, data: resp });
    }

    return res.json(resp);
  } catch (err) {
    console.error('NewsAPI error:', err?.response?.data || err);
    return res.status(500).json({ error: 'news_fetch_failed' });
  }
});

// --- FEATURED WHO ARTICLE PREVIEW ---
const FEATURED_WHO_URL =
  "https://www.who.int/westernpacific/newsroom/feature-stories/item/10-health-tips-for-2025";

/**
 * Returns metadata for the WHO story:
 * { title, description, image, url, published }
 */
app.get("/api/featured-health", async (_req, res) => {
  try {
    const r = await fetch(FEATURED_WHO_URL, {
      headers: { "User-Agent": "MedLink/1.0 (+preview)" },
    });
    if (!r.ok) throw new Error(`WHO HTTP ${r.status}`);
    const html = await r.text();
    const $ = cheerio.load(html);

    // Prefer OpenGraph tags; fall back as needed
    const og = (p) => $(`meta[property="${p}"]`).attr("content") || "";
    const title =
      og("og:title") || $("title").first().text().trim() || "WHO feature story";
    const description =
      og("og:description") ||
      $('meta[name="description"]').attr("content") ||
      "Feature story from the World Health Organization.";
    const image = og("og:image") || "";
    const published =
      $('meta[property="article:published_time"]').attr("content") ||
      $("time").first().attr("datetime") ||
      "2024-12-24";

    res.json({
      title,
      description,
      image,
      url: FEATURED_WHO_URL,
      published,
    });
  } catch (e) {
    console.error("featured-health fetch/parse error:", e);
    // Graceful fallback so your page still renders
    res.json({
      title: "10 health tips for 2025",
      description:
        "Start the new year with practical health tips from the WHO: eat well, reduce salt and sugar, avoid harmful fats, don’t smoke, stay active, and more.",
      image: "",
      url: FEATURED_WHO_URL,
      published: "2024-12-24",
      note: "Using fallback copy due to fetch/parse error.",
    });
  }
});

// --- FEATURED WHO ARTICLE PREVIEW ---
const FEATURED_FOOD_CANADA_URL =
  "https://food-guide.canada.ca/en/?utm_source=canada-ca-foodguide-en&utm_medium=vurl&utm_campaign=foodguide-2021";

/**
 * Returns metadata for the FOOD_CANADA story:
 * { title, description, image, url, published }
 */
app.get("/api/featured-food", async (_req, res) => {
  try {
    const r = await fetch(FEATURED_FOOD_CANADA_URL, {
      headers: { "User-Agent": "MedLink/1.0 (+preview)" },
    });
    if (!r.ok) throw new Error(`FOOD_CANADA HTTP ${r.status}`);
    const html = await r.text();
    const $ = cheerio.load(html);

    // Prefer OpenGraph tags; fall back as needed
    const og = (p) => $(`meta[property="${p}"]`).attr("content") || "";
    const title =
      og("og:title") || $("title").first().text().trim() || "FOOD_CANADA feature story";
    const description =
      og("og:description") ||
      $('meta[name="description"]').attr("content") ||
      "Feature story from Health Canada.";
    const image = og("og:image") || "";
    const published =
      $('meta[property="article:published_time"]').attr("content") ||
      $("time").first().attr("datetime") ||
      "2025-09-13";

    res.json({
      title,
      description,
      image,
      url: FEATURED_FOOD_CANADA_URL,
      published,
    });
  } catch (e) {
    console.error("featured-food fetch/parse error:", e);
    // Graceful fallback so your page still renders
    res.json({
      title: "Canada Food Guide",
      description:
        "Eat a variety of healthy foods each day.",
      image: "",
      url: FEATURED_FOOD_CANADA_URL,
      published: "2025-09-13",
      note: "Using fallback copy due to fetch/parse error.",
    });
  }
});

// --- openFDA: Drug Label proxy with fallbacks (public GET) ---
app.get("/api/fda/drug-label", async (req, res) => {
  try {
    const { q = "", limit = 10, skip = 0 } = req.query;

    const apiKey = (process.env.DRUG_SEARCH_API_KEY || "").trim();
    const paramsBase = () => {
      const p = new URLSearchParams();
      if (apiKey) p.set("api_key", apiKey);
      p.set("limit", String(Math.min(Math.max(+limit || 10, 1), 50))); // 1–50
      p.set("skip", String(Math.max(+skip || 0, 0)));
      return p;
    };

    const OPENFDA_URL = `${OPENFDA_BASE}/drug/label.json`;

    // ---------- helpers ----------
    const looksAdvancedLucene = (s) =>
      /[:()"*+\-]|(?:\bAND\b|\bOR\b|\bNOT\b)/i.test(s);

    const escapeLucene = (s) => s.replace(/([\\"])/g, "\\$1");

    const EXACT_FIELDS = [
      "active_ingredient",
      "openfda.generic_name",
      "openfda.brand_name",
      "openfda.substance_name",
    ];

    const BROAD_FIELDS = [
      "active_ingredient",
      "openfda.generic_name",
      "openfda.brand_name",
      "openfda.substance_name",
      "indications_and_usage",
      "purpose",
      "warnings",
      "dosage_and_administration",
    ];

    const buildExactSearch = (raw) => {
      if (looksAdvancedLucene(raw)) return raw; // pass-through
      const quoted = `"${escapeLucene(raw)}"`;
      return EXACT_FIELDS.map((f) => `${f}:${quoted}`).join(" OR ");
    };

    // “closest possible”: split words, use prefix wildcards and broaden fields.
    // Each word must match somewhere (AND between words); within a word, OR the fields.
    const buildClosestSearch = (raw) => {
      const words = raw
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5); // keep it sane
      if (words.length === 0) return "";

      const perWordGroup = (w) => {
        const wEsc = w.replace(/([\\"])/g, "\\$1");
        const prefix = `${wEsc}*`; // prefix wildcard
        // mix of unquoted prefix wildcard and quoted term for safety
        const parts = BROAD_FIELDS.flatMap((f) => [
          `${f}:${prefix}`,
          `${f}:"${wEsc}"`,
        ]);
        return `(${parts.join(" OR ")})`;
      };

      return words.map(perWordGroup).join(" AND ");
    };

    const fetchFDA = async (searchExpr, label) => {
      const p = paramsBase();
      if (searchExpr) p.set("search", searchExpr);
      const url = `${OPENFDA_URL}?${p.toString()}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) {
        // 404 (NOT_FOUND) is expected when no matches – treat as empty
        if (r.status === 404) {
          return { meta: null, results: [], status: 404, strategy: label, url };
        }
        const text = await r.text().catch(() => "");
        throw Object.assign(new Error(`openFDA ${r.status} ${r.statusText}`), {
          status: r.status,
          detail: text,
          url,
          strategy: label,
        });
      }
      const data = await r.json();
      const results = data.results || [];
      return {
        meta: data.meta || null,
        results,
        status: 200,
        strategy: label,
        url,
      };
    };

    // ---------- Tier 1: EXACT ----------
    const raw = (q || "").trim();
    let attempt = await fetchFDA(buildExactSearch(raw), "exact");

    // ---------- Tier 2: CLOSEST POSSIBLE (if empty) ----------
    if ((attempt.results?.length || 0) === 0 && raw) {
      attempt = await fetchFDA(buildClosestSearch(raw), "closest");
    }

    // ---------- Tier 3: DEFAULT (if still empty) ----------
    if ((attempt.results?.length || 0) === 0) {
      const defaults = ["ibuprofen", "acetaminophen", "amoxicillin"];
      let defaultAttempt = null;
      for (const term of defaults) {
        defaultAttempt = await fetchFDA(buildExactSearch(term), "default");
        if ((defaultAttempt.results?.length || 0) > 0) {
          attempt = { ...defaultAttempt, usedDefaultTerm: term };
          break;
        }
      }
    }

    // Respond with the best we got; add some hints for the UI
    const meta = attempt.meta || {
      results: {
        skip: Number(skip) || 0,
        limit: Number(limit) || 10,
        total: attempt.results?.length || 0,
      },
    };

    res.json({
      meta,
      results: attempt.results || [],
      strategy: attempt.strategy, // "exact" | "closest" | "default"
      usedQuery: raw || null,
      usedUrl: attempt.url,
      ...(attempt.usedDefaultTerm ? { usedDefaultTerm: attempt.usedDefaultTerm } : {}),
    });
  } catch (err) {
    console.error("/api/fda/drug-label error", err);
    const status = err.status || 500;
    return res.status(status).json({
      error: "server_error_openfda",
      detail: err.detail || err.message || "unknown",
      url: err.url,
      strategy: err.strategy,
    });
  }
});


app.listen(port, () => console.log(`API Server listening on port ${port}`));

app.get('/api/health', (req,res)=>{
  res.json({
    ok:true,
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    audienceConfigured: authConfig.audience && authConfig.audience !== '{yourApiIdentifier}',
    unauthMode: process.env.ALLOW_UNAUTH_TRIAGE === 'true'
  });
});
