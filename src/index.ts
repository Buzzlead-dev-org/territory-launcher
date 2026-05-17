// @buzzlead/territory-launcher — public API
// Pure functions for each pipeline step, plus a `runTerritory` orchestrator.

export type {
  SiteAnalysis,
  MarketIntel,
  BuyerPain,
  CampaignAngle,
  RawProspect,
  Prospect,
  AppState,
} from "./types";

export { analyzeSite } from "./crawl";
export { buildIntel } from "./intel";
export { generateCampaigns } from "./campaigns";
export { findProspects } from "./aiark";
export { writeCopy } from "./copy";
export { buildCsv } from "./utils";

import { analyzeSite } from "./crawl";
import { buildIntel } from "./intel";
import { generateCampaigns } from "./campaigns";
import { findProspects, type MergedProspect } from "./aiark";
import { writeCopy } from "./copy";
import type {
  CampaignAngle,
  MarketIntel,
  Prospect,
  RawProspect,
  SiteAnalysis,
} from "./types";

export interface RunOptions {
  url: string;
  icpOverride?: string;
  /** Which of the 3 generated angles to use. If omitted, defaults to "pain". */
  angle?: "pain" | "competitor" | "signal";
  /** How many verified prospects to source. Default 10, max 100. */
  count?: number;
  /** Optional progress callback for CLIs / UIs. */
  onProgress?: (step: ProgressStep) => void;
}

export type ProgressStep =
  | { kind: "crawl"; status: "start" | "done"; data?: SiteAnalysis }
  | { kind: "intel"; status: "start" | "done"; data?: MarketIntel }
  | { kind: "campaigns"; status: "start" | "done"; data?: CampaignAngle[] }
  | { kind: "select-angle"; campaign: CampaignAngle }
  | { kind: "prospects"; status: "start" | "done"; data?: MergedProspect[] }
  | { kind: "copy"; status: "start" | "done"; data?: Prospect[] };

export interface RunResult {
  siteAnalysis: SiteAnalysis;
  intel: MarketIntel;
  campaigns: CampaignAngle[];
  selectedCampaign: CampaignAngle;
  prospects: Prospect[];
}

export async function runTerritory(opts: RunOptions): Promise<RunResult> {
  const { url, icpOverride, angle = "pain", count = 10, onProgress } = opts;
  const tick = (step: ProgressStep) => onProgress?.(step);

  tick({ kind: "crawl", status: "start" });
  const siteAnalysis = await analyzeSite(url);
  tick({ kind: "crawl", status: "done", data: siteAnalysis });

  tick({ kind: "intel", status: "start" });
  const intel = await buildIntel(siteAnalysis, icpOverride);
  tick({ kind: "intel", status: "done", data: intel });

  tick({ kind: "campaigns", status: "start" });
  const campaigns = await generateCampaigns(siteAnalysis, intel);
  tick({ kind: "campaigns", status: "done", data: campaigns });

  const selectedCampaign =
    campaigns.find((c) => c.id === angle) || campaigns[0];
  tick({ kind: "select-angle", campaign: selectedCampaign });

  tick({ kind: "prospects", status: "start" });
  const cappedCount = Math.max(1, Math.min(100, count));
  const merged = await findProspects({
    titles: selectedCampaign.targetTitle,
    employeeSizeStart: 11,
    employeeSizeEnd: 1000,
    searchSize: Math.min(100, cappedCount * 2),
    maxResults: cappedCount,
    maxWaitMs: 600_000, // 10 min — CLI has no Vercel timeout
  });
  tick({ kind: "prospects", status: "done", data: merged });

  const rawProspects: RawProspect[] = merged.map((p) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    company: p.company,
    title: p.title,
    linkedinUrl: p.linkedinUrl,
  }));

  tick({ kind: "copy", status: "start" });
  const prospects = await writeCopy({
    prospects: rawProspects,
    campaign: selectedCampaign,
    siteAnalysis,
    intel,
  });
  tick({ kind: "copy", status: "done", data: prospects });

  return { siteAnalysis, intel, campaigns, selectedCampaign, prospects };
}
