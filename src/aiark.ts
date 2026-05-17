// AI Ark API wrapper.
// Spec: https://docs.ai-ark.com  (OpenAPI 3.1)
// Auth: X-TOKEN header
// Base server: https://api.ai-ark.com/api/developer-portal

const BASE_URL = "https://api.ai-ark.com/api/developer-portal";

function headers() {
  return {
    "X-TOKEN": process.env.AI_ARK_API_KEY || "",
    "Content-Type": "application/json",
  };
}

// ---------- People Search ----------

interface SmartContent {
  mode: "SMART" | "WORD" | "STRICT";
  content: string[];
}

interface AnyAllInclude<T> {
  any?: { include?: T; exclude?: T };
  all?: { include?: T; exclude?: T };
}

export interface PeopleSearchBody {
  page: number;
  size: number;
  account?: {
    employeeSize?: {
      type: "RANGE";
      range: Array<{ start: number; end: number }>;
    };
    industries?: AnyAllInclude<SmartContent>;
  };
  contact?: {
    experience?: {
      latest?: {
        title?: AnyAllInclude<SmartContent>;
      };
    };
  };
}

// Person object from /v1/people response — only the fields we actually use
export interface PersonSearchResult {
  id?: string;
  identifier?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    headline?: string;
    title?: string;
  };
  link?: {
    linkedin?: string;
  };
  industry?: string;
  company?: {
    summary?: { name?: string };
    link?: { domain?: string; domain_ltd?: string; website?: string };
  };
  position_groups?: Array<{
    company?: {
      name?: string;
      url?: string;
    };
    profile_positions?: Array<{ company?: string; title?: string }>;
  }>;
}

export interface PeopleSearchResponse {
  content: PersonSearchResult[];
  trackId: string;
  numberOfElements?: number;
  totalElements?: number;
  empty?: boolean;
}

export async function peopleSearch(body: PeopleSearchBody): Promise<PeopleSearchResponse> {
  const res = await fetch(`${BASE_URL}/v1/people`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Ark people search failed (${res.status}): ${t.slice(0, 400)}`);
  }
  const json = (await res.json()) as PeopleSearchResponse;
  if (!json.trackId) {
    throw new Error("AI Ark people search response missing trackId");
  }
  return json;
}

// Build a request body from a target title list.
export function buildSearchBodyFromTitles(
  titles: string[],
  opts: { employeeSizeStart?: number; employeeSizeEnd?: number; page?: number; size?: number } = {}
): PeopleSearchBody {
  const body: PeopleSearchBody = {
    page: opts.page ?? 0,
    size: opts.size ?? 20,
    contact: {
      experience: {
        latest: {
          title: {
            any: {
              include: { mode: "SMART", content: titles },
            },
          },
        },
      },
    },
  };

  if (opts.employeeSizeStart != null && opts.employeeSizeEnd != null) {
    body.account = {
      employeeSize: {
        type: "RANGE",
        range: [{ start: opts.employeeSizeStart, end: opts.employeeSizeEnd }],
      },
    };
  }
  return body;
}

// ---------- Email Finder ----------

export interface EmailFinderStats {
  trackId: string;
  state: string; // "PENDING" | "DONE" | "FAILED" | ... (string per OpenAPI)
  statistics?: { total?: number; found?: number; success?: number; failed?: number };
  webhook?: { state?: string | null; retry?: string | null };
  description?: string | null;
}

export async function startEmailFinder(trackId: string): Promise<EmailFinderStats> {
  // AI Ark enforces `webhook` as required despite the OpenAPI listing it optional.
  // We pass a dummy URL — results are fetched via /statistics + /inquiries polling below.
  // Override via AIARK_EMAIL_FINDER_WEBHOOK env if a real receiver is in place.
  const webhook = process.env.AIARK_EMAIL_FINDER_WEBHOOK || "https://webhook.site/unused";

  const res = await fetch(`${BASE_URL}/v1/people/email-finder`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ trackId, webhook }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Ark email-finder start failed (${res.status}): ${t.slice(0, 400)}`);
  }
  return (await res.json()) as EmailFinderStats;
}

export async function getEmailFinderStats(trackId: string): Promise<EmailFinderStats> {
  const res = await fetch(`${BASE_URL}/v1/people/email-finder/${trackId}/statistics`, {
    headers: headers(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Ark stats failed (${res.status}): ${t.slice(0, 400)}`);
  }
  return (await res.json()) as EmailFinderStats;
}

export interface EmailFinderInquiry {
  refId: string;
  state: string;
  input: {
    firstname: string;
    lastname: string;
    domain: string;
  };
  output?: Array<{
    address: string;
    status?: string; // "VALID" | "RISKY" | "INVALID" | "UNKNOWN" | ...
    subStatus?: string;
    domainType?: string; // "SMTP" | "CATCH_ALL" | ...
    free?: boolean;
    generic?: boolean;
    found?: boolean;
    mx?: { record?: string; provider?: string };
    date?: string;
  }>;
}

export interface InquiriesPage {
  content: EmailFinderInquiry[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  last?: boolean;
  empty?: boolean;
}

export async function getEmailFinderInquiries(
  trackId: string,
  page = 0,
  size = 50
): Promise<InquiriesPage> {
  const res = await fetch(
    `${BASE_URL}/v1/people/email-finder/${trackId}/inquiries?page=${page}&size=${size}`,
    { headers: headers() }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Ark inquiries failed (${res.status}): ${t.slice(0, 400)}`);
  }
  return (await res.json()) as InquiriesPage;
}

// ---------- High-level orchestration ----------

const TERMINAL_STATES = new Set(["DONE", "COMPLETED", "COMPLETE", "FINISHED", "FAILED", "ERROR"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface MergedProspect {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  emailStatus?: string;
  title: string;
  company: string;
  domain: string;
  linkedinUrl?: string;
}

function getDomain(p: PersonSearchResult): string {
  return (
    p.company?.link?.domain ||
    p.company?.link?.domain_ltd ||
    (p.company?.link?.website ? p.company.link.website.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] : "") ||
    ""
  );
}

function getCompanyName(p: PersonSearchResult): string {
  return (
    p.company?.summary?.name ||
    p.position_groups?.[0]?.company?.name ||
    p.position_groups?.[0]?.profile_positions?.[0]?.company ||
    ""
  );
}

function getTitle(p: PersonSearchResult): string {
  return (
    p.profile?.title ||
    p.position_groups?.[0]?.profile_positions?.[0]?.title ||
    p.profile?.headline ||
    ""
  );
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

// Match inquiry output back to a person from the search.
function matchPerson(
  inquiry: EmailFinderInquiry,
  people: PersonSearchResult[]
): PersonSearchResult | null {
  const f = normalizeName(inquiry.input.firstname);
  const l = normalizeName(inquiry.input.lastname);
  const d = inquiry.input.domain.toLowerCase();

  return (
    people.find((p) => {
      const pf = normalizeName(p.profile?.first_name || "");
      const pl = normalizeName(p.profile?.last_name || "");
      const pd = getDomain(p).toLowerCase();
      return pf === f && pl === l && pd === d;
    }) ||
    // fallback: name only (domain may differ in casing/format)
    people.find((p) => {
      const pf = normalizeName(p.profile?.first_name || "");
      const pl = normalizeName(p.profile?.last_name || "");
      return pf === f && pl === l;
    }) ||
    null
  );
}

function pickBestEmail(outputs: EmailFinderInquiry["output"]):
  | { address: string; status: string }
  | null {
  if (!outputs?.length) return null;
  const ranked = [...outputs].sort((a, b) => {
    const score = (o: NonNullable<EmailFinderInquiry["output"]>[number]) => {
      let s = 0;
      if (o.status === "VALID") s += 10;
      if (o.status === "RISKY") s += 5;
      if (o.found) s += 2;
      if (o.domainType === "SMTP") s += 1;
      return s;
    };
    return score(b) - score(a);
  });
  const best = ranked[0];
  return best?.address ? { address: best.address, status: best.status || "" } : null;
}

export interface RunOptions {
  titles: string[];
  employeeSizeStart?: number;
  employeeSizeEnd?: number;
  searchSize?: number;
  maxResults?: number;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

// End-to-end: search → start email finder → poll → fetch results → merge.
export async function findProspects(opts: RunOptions): Promise<MergedProspect[]> {
  const search = await peopleSearch(
    buildSearchBodyFromTitles(opts.titles, {
      employeeSizeStart: opts.employeeSizeStart,
      employeeSizeEnd: opts.employeeSizeEnd,
      size: opts.searchSize ?? 20,
    })
  );

  if (!search.content?.length) {
    throw new Error("AI Ark people search returned no matches. Try a broader target title.");
  }

  await startEmailFinder(search.trackId);

  const maxWaitMs = opts.maxWaitMs ?? 28000;
  const pollIntervalMs = opts.pollIntervalMs ?? 2000;
  const start = Date.now();

  let lastStats: EmailFinderStats | null = null;
  while (Date.now() - start < maxWaitMs) {
    await sleep(pollIntervalMs);
    lastStats = await getEmailFinderStats(search.trackId);
    const state = (lastStats.state || "").toUpperCase();
    if (TERMINAL_STATES.has(state)) break;
    // also exit early if all found
    if (
      lastStats.statistics?.total &&
      lastStats.statistics.found != null &&
      lastStats.statistics.found >= lastStats.statistics.total
    ) {
      break;
    }
  }

  const inquiriesPage = await getEmailFinderInquiries(search.trackId, 0, 100);
  const merged: MergedProspect[] = [];

  for (const inq of inquiriesPage.content || []) {
    const best = pickBestEmail(inq.output);
    if (!best) continue;
    if (best.status && !["VALID", "RISKY"].includes(best.status.toUpperCase())) continue;

    const person = matchPerson(inq, search.content);
    const firstName = person?.profile?.first_name || inq.input.firstname || "";
    const lastName = person?.profile?.last_name || inq.input.lastname || "";

    merged.push({
      firstName,
      lastName,
      fullName: person?.profile?.full_name || `${firstName} ${lastName}`.trim(),
      email: best.address,
      emailStatus: best.status,
      title: person ? getTitle(person) : "",
      company: person ? getCompanyName(person) : "",
      domain: inq.input.domain,
      linkedinUrl: person?.link?.linkedin,
    });

    if (merged.length >= (opts.maxResults ?? 10)) break;
  }

  return merged;
}
