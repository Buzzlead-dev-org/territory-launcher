import Exa from "exa-js";
import { askJson } from "./claude";
import type { BuyerPain, MarketIntel, SiteAnalysis } from "./types";

interface ExaResult {
  url: string;
  title?: string;
  text?: string;
  highlights?: string[];
}

function normalize(raw: unknown): ExaResult[] {
  const results = (raw as { results?: unknown[] })?.results || [];
  return results.map((r) => {
    const item = r as { url: string; title?: string; text?: string; highlights?: string[] };
    return { url: item.url, title: item.title, text: item.text, highlights: item.highlights };
  });
}

function extractSubreddit(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.host.endsWith("reddit.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "r" && parts[1]) return parts[1].toLowerCase();
    return null;
  } catch {
    return null;
  }
}

async function pickSubreddits(siteAnalysis: SiteAnalysis, icp: string): Promise<string[]> {
  const system = `You map B2B companies to the specific subreddits where their REAL buyers post.

Rules:
- Output 5-8 subreddit names without the "r/" prefix.
- Pick subs where the BUYER of this product posts about their work, NOT where the product is built or where industry workers commiserate. e.g. for accounting software, pick r/Entrepreneur, r/smallbusiness — NOT r/accounting.
- Avoid general venting subs (r/antiwork, r/politics, r/news). Avoid meme subs.
- Prefer high-signal communities: r/sales, r/SaaS, r/Entrepreneur, r/marketing, r/agency, r/cscareerquestions, r/ProductManagement, r/startups, r/smallbusiness, r/sysadmin (only if the buyer IS an IT/sysadmin).
- Output ONLY a JSON array of strings: ["sub1", "sub2", ...]. No markdown fences. No commentary.`;

  const user = `Company: ${siteAnalysis.companyName}
What they sell: ${siteAnalysis.description}
Category: ${siteAnalysis.category}
ICP (the BUYER): ${icp}

Which 5-8 subreddits are these buyers most likely to post in about their actual work problems?`;

  try {
    const subs = await askJson<string[]>({ system, user, maxTokens: 300, temperature: 0.2 });
    if (Array.isArray(subs) && subs.length > 0) {
      return subs
        .map((s) => String(s).replace(/^r\//i, "").trim().toLowerCase())
        .filter((s) => /^[a-z0-9_]+$/.test(s))
        .slice(0, 8);
    }
  } catch {
    // fall through to a safe default
  }
  return ["sales", "saas", "entrepreneur", "marketing", "startups", "smallbusiness"];
}

export async function buildIntel(
  siteAnalysis: SiteAnalysis,
  icpOverride?: string
): Promise<MarketIntel> {
  if (!process.env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is required for the intel step");
  }
  const exa = new Exa(process.env.EXA_API_KEY);
  const icp = icpOverride?.trim() || siteAnalysis.icp;

  const subs = await pickSubreddits(siteAnalysis, icp);
  const subSet = new Set(subs);
  const subsQueryFragment = subs.map((s) => `site:reddit.com/r/${s}`).join(" OR ");

  const [painRaw, compRaw] = await Promise.all([
    exa.searchAndContents(
      `(${subsQueryFragment}) "${siteAnalysis.category}" problems frustrations complaints`,
      {
        numResults: 10,
        text: { maxCharacters: 900 },
        highlights: { numSentences: 3, highlightsPerUrl: 2 },
      } as never
    ),
    exa.searchAndContents(
      `"alternatives to" OR "vs" ${siteAnalysis.companyName} OR "${siteAnalysis.category}" site:reddit.com OR site:g2.com OR site:capterra.com`,
      { numResults: 5, text: { maxCharacters: 600 } } as never
    ),
  ]);

  const painAll = normalize(painRaw);
  const compResults = normalize(compRaw);

  let painResults = painAll.filter((r) => {
    const sub = extractSubreddit(r.url);
    return sub != null && subSet.has(sub);
  });
  if (painResults.length === 0) painResults = painAll;
  painResults = painResults.slice(0, 6);

  const painCorpus = painResults
    .map(
      (r, i) =>
        `[${i + 1}] ${r.url}\n${(r.highlights?.join(" ") || r.text || "").slice(0, 700)}`
    )
    .join("\n\n");
  const compCorpus = compResults
    .map((r, i) => `[${i + 1}] ${r.url}\n${(r.text || "").slice(0, 500)}`)
    .join("\n\n");

  const system = `You are a B2B market researcher. You will be given Reddit threads and review-site content about a product category.

Your job:
1. Extract EXACTLY 5 buyer pain phrases. Use the BUYER'S exact language (verbatim or near-verbatim), not marketing speak. Short and punchy.
   For each pain, include "sourceIndex" — the [N] number of the Reddit thread it came from. If the same phrase appears in multiple threads, pick the strongest source.
2. Identify 3-5 competitor product names (proper nouns only). Exclude the seller's own company.
3. Refine the ICP based on who is posting these complaints.

Return ONLY valid JSON in this shape:
{
  "buyerPains": [
    { "quote": "...", "sourceIndex": 1 },
    { "quote": "...", "sourceIndex": 3 }
  ],
  "competitors": ["Name1","Name2","Name3"],
  "icpRefined": "refined ICP string"
}
No markdown fences. No commentary.`;

  const user = `Seller company: ${siteAnalysis.companyName}
Category: ${siteAnalysis.category}
Baseline ICP: ${icp}

=== REDDIT THREADS (buyer pains) ===
${painCorpus || "(no results)"}

=== REVIEW / ALTERNATIVES CONTENT (competitors) ===
${compCorpus || "(no results)"}`;

  interface RawIntel {
    buyerPains: Array<{ quote: string; sourceIndex?: number }>;
    competitors: string[];
    icpRefined: string;
  }
  const raw = await askJson<RawIntel>({ system, user, maxTokens: 900, temperature: 0.3 });

  const buyerPains: BuyerPain[] = (raw.buyerPains || []).map((p) => {
    const idx = (p.sourceIndex ?? 0) - 1;
    const sourceUrl =
      idx >= 0 && idx < painResults.length ? painResults[idx].url : undefined;
    return { quote: p.quote, sourceUrl };
  });

  return {
    buyerPains,
    competitors: raw.competitors || [],
    icpRefined: raw.icpRefined || "",
    redditSources: painResults.map((r) => r.url),
    subreddits: subs,
  };
}
