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


app.listen(port, () => console.log(`API Server listening on port ${port}`));

app.get('/api/health', (req,res)=>{
  res.json({
    ok:true,
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    audienceConfigured: authConfig.audience && authConfig.audience !== '{yourApiIdentifier}',
    unauthMode: process.env.ALLOW_UNAUTH_TRIAGE === 'true'
  });
});
