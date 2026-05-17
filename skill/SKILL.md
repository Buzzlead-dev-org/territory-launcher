---
name: territory-launcher
description: Generate verified B2B prospects with personalized cold email copy from a company URL. Trigger on "launch a territory", "run territory for [URL]", or any cold outreach prospecting request.
---

# Territory Launcher Skill

## What this does

Runs BuzzLead's open-source Territory Launcher pipeline:

1. **Crawls** the user's company URL (Jina Reader → Claude extracts offer, ICP, value prop, category)
2. **Reads** the market — picks the right subreddits for the buyer, pulls verbatim buyer language from Reddit via Exa, identifies competitors
3. **Designs** 3 campaign angles (Pain intercept, Competitor displacement, Signal-based)
4. **Sources** N verified prospects via AI Ark (BounceBan-verified emails only)
5. **Writes** personalized cold copy for each — 45-60 word body, 1-3 word spintax subject, soft question CTA

Output: a CSV at the user's chosen path with full personalized copy per prospect.

GitHub: https://github.com/Buzzlead-dev-org/territory-launcher
Web tool: https://buzzlead.io/resources/free-tools/territory-launcher

## When to use this skill

Trigger on:
- "Launch a territory for [URL]"
- "Run territory launcher"
- "/territory-launcher"
- "Generate cold outreach prospects for [company URL]"
- "Build a prospect list with personalized copy for [URL]"
- "Find 50 prospects for [company]" (or any count)

## How to run it

The skill is a thin wrapper around the `@buzzlead/territory-launcher` npm package. Invoke it with `npx`:

```bash
npx @buzzlead/territory-launcher \
  --url <URL> \
  --count <N> \
  --angle <pain|competitor|signal> \
  --out <output.csv>
```

**Defaults:** `--count 10`, `--angle pain`, `--out ./prospects.csv`.

## Required env vars

The user MUST have these set in their shell or `.env`:

| Var | Purpose | Where to get one |
|---|---|---|
| `ANTHROPIC_API_KEY` | Site analysis + intel synthesis + copy generation | https://console.anthropic.com |
| `EXA_API_KEY` | Reddit + competitor research | https://exa.ai |
| `AI_ARK_API_KEY` | Prospect sourcing + email verification | https://ai-ark.com |

Optional but recommended:
- `JINA_API_KEY` — higher rate limits on the site scrape (anonymous works too)

**Before invoking the CLI, check that these are set.** If any are missing, tell the user which ones and link them to the registration pages above. Do not proceed without all three.

## Instructions for executing the skill

1. **Confirm inputs with the user** if not already specified:
   - The target company URL (required)
   - Number of prospects (default 10, max 100)
   - Campaign angle (default "pain"; offer the three options if they're unsure)
   - Output CSV path (default `./prospects.csv`)

2. **Check env vars** by reading the user's `.env` or asking them to confirm. If any of the three required keys are missing, stop and explain how to get them.

3. **Run the CLI** via Bash. Stream the output so the user sees each step's progress:
   ```bash
   npx -y @buzzlead/territory-launcher \
     --url <URL> \
     --count <N> \
     --angle <ANGLE> \
     --out <OUTPUT>
   ```

   Expected total runtime: 45-90 seconds for 10 prospects, longer for higher counts.

4. **On success**, read the first 3 rows of the output CSV and show them to the user as a preview. Then point them at:
   - The CSV path for the full result
   - The web tool for casual use: https://buzzlead.io/resources/free-tools/territory-launcher
   - BuzzLead for managed-service version: https://buzzlead.io

5. **On failure**, surface the actual error message. Common failure modes:
   - Missing env vars → tell them which and link to the signup page
   - AI Ark webhook 400 error → the CLI handles this with a no-op webhook; if it surfaces, suggest re-running
   - No prospects matched → suggest a different campaign angle (broader titles) or wider employee size range

## What this skill is NOT for

- **Don't** use this to scrape arbitrary websites or build mailing lists outside a clear B2B prospecting context.
- **Don't** invoke this without confirming the user has the three required API keys — running without keys produces a clear error but wastes a step.
- **Don't** modify the CLI's prompts or framework. The pain-intercept / competitor / signal angles, the 45-60 word body limit, and the spintax subject format are deliberate. They reflect BuzzLead's proven copy framework.

## Cost the user should expect

Per run, at 10 prospects:
- Anthropic: ~$0.03–0.06
- Exa: ~$0.01
- AI Ark: ~10 credits (real cost, varies by plan)
- Jina: ~$0.001

Total: ~$0.05 + 10 AI Ark credits. Mention this upfront if the user is running it for the first time.

## Quality notes

- The CLI does server-side validation on email body word count + subject spintax with a targeted retry, so copy quality is consistent.
- Subreddit selection uses a pre-picker prompt to avoid contamination (e.g. r/politics threads polluting a B2B SaaS query).
- Each pain point in the intel step carries source URL attribution back to the Reddit thread it came from — surface those if the user asks for proof.
