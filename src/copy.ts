import { askJson } from "./claude";
import type {
  CampaignAngle,
  MarketIntel,
  Prospect,
  RawProspect,
  SiteAnalysis,
} from "./types";

interface CopyOut {
  prospectIndex: number;
  personalizedLine: string;
  emailSubject: string;
  emailBody: string;
}

function wordCount(s: string): number {
  return (s || "").split(/\s+/).filter(Boolean).length;
}

const SPINTAX_RE = /^\{[^{}|]+(\|[^{}|]+){0,3}\}$/;
const PLAIN_SUBJECT_RE = /^[\w\s'-]{2,30}$/;

function inspectCopy(c: CopyOut): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const wc = wordCount(c.emailBody);
  if (wc < 35) reasons.push(`body too short (${wc} words; need 45-60)`);
  if (wc > 70) reasons.push(`body too long (${wc} words; need 45-60)`);
  const subj = (c.emailSubject || "").trim();
  if (!subj) reasons.push("subject missing");
  else if (!SPINTAX_RE.test(subj) && !PLAIN_SUBJECT_RE.test(subj)) {
    reasons.push("subject must be 1-3 plain words OR spintax {A|B|C}");
  }
  return { ok: reasons.length === 0, reasons };
}

async function validateAndFix(
  copy: CopyOut[],
  prospects: RawProspect[],
  system: string
): Promise<CopyOut[]> {
  const bad: { index: number; reasons: string[] }[] = [];
  copy.forEach((c, i) => {
    const idx = typeof c.prospectIndex === "number" ? c.prospectIndex : i;
    const v = inspectCopy(c);
    if (!v.ok) bad.push({ index: idx, reasons: v.reasons });
  });

  if (bad.length === 0) return copy;

  const fixList = bad
    .map((b) => {
      const p = prospects[b.index];
      if (!p) return null;
      return `Prospect ${b.index}:
- Name: ${p.firstName} ${p.lastName}
- Title: ${p.title}
- Company: ${p.company}
- Problems with the previous draft: ${b.reasons.join("; ")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const fixUser = `Rewrite copy ONLY for these prospects. Same campaign angle, same hard rules.

${fixList}

Return ONLY a JSON array with one object per prospect listed above:
[
  {
    "prospectIndex": <index from above>,
    "personalizedLine": "8-12 word opening hook",
    "emailSubject": "{Word|Two Words|Three Word Line} OR a single 1-3 word phrase",
    "emailBody": "45-60 words, ends with a soft question CTA"
  }
]`;

  try {
    const fixed = await askJson<CopyOut[]>({
      system,
      user: fixUser,
      maxTokens: 1800,
      temperature: 0.5,
    });
    if (!Array.isArray(fixed)) return copy;

    const merged = [...copy];
    for (const f of fixed) {
      if (typeof f.prospectIndex !== "number") continue;
      const v = inspectCopy(f);
      if (!v.ok) continue;
      const slot = merged.findIndex((x) => x.prospectIndex === f.prospectIndex);
      if (slot >= 0) merged[slot] = f;
    }
    return merged;
  } catch {
    return copy;
  }
}

export interface WriteCopyInput {
  prospects: RawProspect[];
  campaign: CampaignAngle;
  siteAnalysis: SiteAnalysis;
  intel: MarketIntel;
}

export async function writeCopy(input: WriteCopyInput): Promise<Prospect[]> {
  const { prospects, campaign, siteAnalysis, intel } = input;
  if (!prospects.length) return [];

  const system = `You are a cold email copywriter for BuzzLead, a B2B outbound agency that has sent 10M+ cold emails.

HARD RULES:
- Every email body: 45-60 words max. Count them.
- Subject lines: 1-3 words, no punctuation, spintax format: {Word|Two Words|Three Word Line}
- Opening line (personalizedLine): 8-12 words. Reference something real and specific about them or their company role.
- CTA: always soft and question-based. Never "let's hop on a call." Email body must END with a question.
- Tone: peer-to-peer, not vendor-to-buyer. Short sentences.
- No emojis. No fluff. No em dashes. No "I noticed," "just reaching out," "hope this finds you."
- Output ONLY valid JSON. No markdown fences. No commentary.

CAMPAIGN ANGLE: ${campaign.name}
ANGLE TYPE: ${campaign.tag}
COMPANY SELLING: ${siteAnalysis.companyName} — ${siteAnalysis.description}
VALUE PROP: ${siteAnalysis.valueProp}
TOP BUYER PAINS (verbatim): ${intel.buyerPains.map((p) => p.quote).join(" | ")}`;

  const prospectBlock = prospects
    .map(
      (p, i) =>
        `Prospect ${i}:\n- Name: ${p.firstName} ${p.lastName}\n- Title: ${p.title}\n- Company: ${p.company}`
    )
    .join("\n\n");

  const user = `Write personalized cold email copy for each prospect below using the "${campaign.tag}" angle.

${prospectBlock}

Return ONLY a valid JSON array of ${prospects.length} objects (one per prospect, in order):
[
  {
    "prospectIndex": 0,
    "personalizedLine": "8-12 word opening hook specific to this person",
    "emailSubject": "{Word|Two Words|Three Word Line}",
    "emailBody": "45-60 words, ends with a soft question CTA"
  }
]`;

  const copy = await askJson<CopyOut[]>({
    system,
    user,
    maxTokens: 3500,
    temperature: 0.55,
  });
  if (!Array.isArray(copy)) throw new Error("Copy response not an array");

  const validated = await validateAndFix(copy, prospects, system);

  return prospects.map((p, i) => {
    const c =
      validated.find((x) => x.prospectIndex === i) ||
      validated[i] || {
        prospectIndex: i,
        personalizedLine: "",
        emailSubject: "",
        emailBody: "",
      };
    return {
      id: `${p.email || p.lastName}-${i}`,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      company: p.company,
      title: p.title,
      linkedinUrl: p.linkedinUrl,
      personalizedLine: c.personalizedLine,
      emailSubject: c.emailSubject,
      emailBody: c.emailBody,
    };
  });
}
