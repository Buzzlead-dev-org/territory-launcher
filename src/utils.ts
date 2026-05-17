import type { CampaignAngle, Prospect } from "./types";

export const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function extractJson<T>(text: string): T {
  let s = text.trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) s = fenceMatch[1].trim();
  const firstBrace = s.search(/[\{\[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace > 0 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new Error(`Model returned non-JSON: ${text.slice(0, 300)}`);
  }
}

// Build a CSV string from prospects. Quotes every value, escapes embedded quotes.
function quote(v: string | undefined): string {
  const s = v ?? "";
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

export function buildCsv(prospects: Prospect[], campaign: CampaignAngle | null): string {
  const headers = [
    "first_name",
    "last_name",
    "email",
    "company",
    "title",
    "linkedin_url",
    "personalized_line",
    "email_subject",
    "email_body",
    "campaign_angle",
  ];
  const lines = [headers.map(quote).join(",")];
  for (const p of prospects) {
    lines.push(
      [
        p.firstName,
        p.lastName,
        p.email,
        p.company,
        p.title,
        p.linkedinUrl ?? "",
        p.personalizedLine,
        p.emailSubject,
        p.emailBody,
        campaign?.name ?? "",
      ]
        .map(quote)
        .join(",")
    );
  }
  return lines.join("\n");
}

