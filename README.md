# Territory Launcher

> Drop a URL. Get N verified prospects + personalized cold copy as a CSV.
> Free CLI from [BuzzLead](https://buzzlead.io).

[![npm version](https://img.shields.io/npm/v/@buzzlead/territory-launcher.svg)](https://www.npmjs.com/package/@buzzlead/territory-launcher)
[![license](https://img.shields.io/npm/l/@buzzlead/territory-launcher.svg)](./LICENSE)

The same engine that powers the [free web tool](https://buzzlead.io/resources/free-tools/territory-launcher) — but without the 10-prospect cap. Run it on your own keys for as many prospects as you need.

```bash
npx @buzzlead/territory-launcher \
  --url stripe.com \
  --count 50 \
  --angle pain \
  --out stripe-prospects.csv
```

In ~2 minutes you get a CSV with 50 verified-email prospects, a personalized opening line for each, a 45–60 word email body, and a spintax subject line. Ready to import into any sender.

---

## What it does

Five steps, fully automated:

1. **Crawl your site** — Jina Reader pulls clean markdown, Claude extracts your offer, ICP, value prop, category.
2. **Read the market** — picks the 5–8 subreddits where your buyer actually posts, then Exa pulls verbatim pain language and competitor mentions. Per-quote source attribution.
3. **Design 3 angles** — Pain intercept, Competitor displacement, Signal-based. Each named, justified, mapped to a target title set.
4. **Source verified prospects** — AI Ark people search + BounceBan email verification. Only valid emails ship.
5. **Write personalized copy** — 45–60 word bodies, 1–3 word spintax subjects, soft question CTAs. Word-count + subject validation with a targeted retry for any drift.

---

## Install

### One-shot via `npx` (no install)

```bash
npx @buzzlead/territory-launcher --url yourcompany.com --count 25
```

### Or install globally

```bash
npm install -g @buzzlead/territory-launcher
territory --url yourcompany.com --count 25
```

### Or use as a library

```ts
import { runTerritory } from "@buzzlead/territory-launcher";

const result = await runTerritory({
  url: "stripe.com",
  count: 50,
  angle: "pain",
  onProgress: (step) => console.log(step.kind, step.status),
});

console.log(result.prospects);
```

---

## API keys

You need three keys. Copy `.env.example` to `.env` and fill them in.

| Key | Why | Where |
|---|---|---|
| `ANTHROPIC_API_KEY` | Site analysis, intel, copy generation | https://console.anthropic.com |
| `EXA_API_KEY` | Reddit + competitor research | https://exa.ai |
| `AI_ARK_API_KEY` | Prospect sourcing + email verification | https://ai-ark.com |

Optional:
- `JINA_API_KEY` — faster lane on the site scrape (anonymous works fine)
- `AIARK_EMAIL_FINDER_WEBHOOK` — your own webhook receiver; defaults to a no-op

---

## Cost per run

Approximate, at 10 prospects:

| Provider | Calls | ~Cost |
|---|---|---|
| Anthropic (Claude sonnet-4-6) | 4–5 calls | $0.03–0.06 |
| Exa | 2 searches | $0.01 |
| AI Ark | 1 search + 10 email lookups | ~10 credits |
| Jina | 1 scrape | ~$0.001 |
| **Total** | | **~$0.05 + 10 AI Ark credits** |

For 50 prospects, roughly 5× the AI Ark credit cost; the Anthropic + Exa costs barely move.

---

## CLI usage

```
Usage: territory [options]

Required:
  -u, --url <url>          Company website URL to analyze

Optional:
  -c, --count <n>          How many verified prospects (1–100). Default: 10
  -a, --angle <id>         Campaign angle: pain | competitor | signal. Default: pain
  -i, --icp <text>         Override the ICP detected from the site
  -o, --out <path>         Output CSV path. Default: ./prospects.csv
      --silent             Suppress progress output
      --json               Print full result as JSON instead of writing a CSV
  -h, --help               Display help
  -V, --version            Display version
```

### Examples

**Quick run, default 10 prospects:**
```bash
territory --url buzzlead.io
```

**Larger pull, pick the competitor displacement angle:**
```bash
territory --url salesforce.com --count 50 --angle competitor --out salesforce-comp.csv
```

**Override the detected ICP:**
```bash
territory --url notion.so --icp "Engineering managers at Series B/C SaaS, 50–200 employees"
```

**Use as JSON for piping into other tools:**
```bash
territory --url stripe.com --count 25 --json > stripe-run.json
```

---

## CSV output

Columns:

```
first_name, last_name, email, company, title, linkedin_url,
personalized_line, email_subject, email_body, campaign_angle
```

Every text field is double-quoted. Newlines inside cells are escaped as `\n`.

---

## How the pipeline differs from the web tool

| | Web tool | CLI |
|---|---|---|
| Prospect cap | 10 | 1–100 per run |
| Rate limit | 3 runs / 24h / IP | None |
| Lead gate | Required | None |
| Auth | Shared keys | Your keys |
| Timeout | 60s (Vercel) | None |
| Cost | Free | Your API spend |

The web tool is a taste. The CLI is the working tool.

---

## Library API

```ts
import {
  runTerritory,        // end-to-end pipeline
  analyzeSite,         // step 1
  buildIntel,          // step 2
  generateCampaigns,   // step 3
  findProspects,       // step 4
  writeCopy,           // step 5
  buildCsv,            // output
} from "@buzzlead/territory-launcher";
```

Each step is a pure async function — you can plug them into your own pipeline, swap one out, or run them individually for debugging.

---

## Want this at scale?

Territory Launcher is a single-shot tool. It runs once, gives you a list, you take it from there.

**BuzzLead the agency** runs this kind of work continuously, every week, for hundreds of prospects per client — with deliverability infrastructure, reply handling, and a meetings-booked SLA. 10M+ cold emails sent. $8M+ in client revenue.

If you want the version with humans behind it, [talk to us at buzzlead.io](https://buzzlead.io).

---

## License

MIT. Use it however you want.
