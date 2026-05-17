import { askJson } from "./claude";
import type { CampaignAngle, MarketIntel, SiteAnalysis } from "./types";

export async function generateCampaigns(
  siteAnalysis: SiteAnalysis,
  intel: MarketIntel
): Promise<CampaignAngle[]> {
  const system = `You are a B2B cold outbound strategist who has sent 10M+ cold emails and generated $8M+ in client revenue.

Given a company and market intel, generate EXACTLY 3 campaign angles. Each must be meaningfully different — not just tone variations.

Use these 3 frameworks, one per angle:
1. id="pain", tag="Pain intercept" — Lead with the #1 buyer complaint in their language. Never pitch first.
2. id="competitor", tag="Competitor displacement" — Target known users of a specific competitor. Requires a tech signal or review signal.
3. id="signal", tag="Signal-based" — Trigger off a real buying signal: new hire, job posting, funding, product launch, headcount growth.

Return ONLY a valid JSON array of 3 objects matching:
[
  {
    "id": "pain" | "competitor" | "signal",
    "tag": "Pain intercept" | "Competitor displacement" | "Signal-based",
    "name": "Creative, specific campaign name, 5-8 words",
    "rationale": "2 sentences max. Why this angle works for this specific company and ICP.",
    "targetTitle": ["Title 1", "Title 2"],
    "triggerSignal": "What to filter for in a prospect database"
  }
]
No markdown fences. No prose outside the JSON.`;

  const user = `Company: ${siteAnalysis.companyName}
What they sell: ${siteAnalysis.description}
Value prop: ${siteAnalysis.valueProp}
Category: ${siteAnalysis.category}
ICP: ${intel.icpRefined}
Top buyer pains (verbatim): ${intel.buyerPains.map((p) => p.quote).join(" | ")}
Known competitors: ${intel.competitors.join(", ")}`;

  const data = await askJson<CampaignAngle[]>({
    system,
    user,
    maxTokens: 1500,
    temperature: 0.55,
  });
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Model returned no campaigns");
  }
  return data;
}
