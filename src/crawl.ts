import { scrapeMarkdown } from "./scrape";
import { askJson } from "./claude";
import { normalizeUrl } from "./utils";
import type { SiteAnalysis } from "./types";

export async function analyzeSite(rawUrl: string): Promise<SiteAnalysis> {
  const url = normalizeUrl(rawUrl);
  const markdown = await scrapeMarkdown(url);

  const system = `You are a B2B GTM analyst. Extract structured data from the website content provided.
Return ONLY valid JSON with these exact keys:
{
  "companyName": "string",
  "description": "1-sentence what they sell and to whom",
  "icp": "specific buyer persona — role, company size, industry",
  "valueProp": "core outcome delivered, not features",
  "category": "product category in 3-5 words"
}
No markdown fences. No commentary.`;

  const user = `Website URL: ${url}\n\nWebsite content (markdown):\n${markdown.slice(0, 8000)}`;

  return askJson<SiteAnalysis>({ system, user, maxTokens: 700, temperature: 0.2 });
}
