#!/usr/bin/env node
import "dotenv/config";
import { writeFileSync, existsSync } from "node:fs";
import { Command } from "commander";
import { runTerritory } from "../src/index";
import { buildCsv } from "../src/utils";
import type { ProgressStep } from "../src/index";

const program = new Command();

program
  .name("territory")
  .description(
    "Drop a URL. Get N verified prospects + personalized cold copy as a CSV.\n" +
      "By BuzzLead — https://buzzlead.io"
  )
  .version("0.1.0")
  .requiredOption("-u, --url <url>", "Company website URL to analyze")
  .option(
    "-c, --count <n>",
    "How many verified prospects to source (1-100)",
    (v) => parseInt(v, 10),
    10
  )
  .option(
    "-a, --angle <id>",
    "Campaign angle: pain | competitor | signal",
    "pain"
  )
  .option(
    "-i, --icp <text>",
    "Override the ICP detected from the site"
  )
  .option(
    "-o, --out <path>",
    "Output CSV path",
    (v) => v,
    "./prospects.csv"
  )
  .option("--silent", "Suppress progress output")
  .option("--json", "Print the full result as JSON to stdout instead of writing a CSV")
  .parse();

const opts = program.opts() as {
  url: string;
  count: number;
  angle: string;
  icp?: string;
  out: string;
  silent?: boolean;
  json?: boolean;
};

function checkEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!process.env.EXA_API_KEY) missing.push("EXA_API_KEY");
  if (!process.env.AI_ARK_API_KEY) missing.push("AI_ARK_API_KEY");
  return missing;
}

const COLOR = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  orange: (s: string) => `\x1b[38;5;208m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

function log(...args: unknown[]) {
  if (!opts.silent) console.error(...args);
}

function printHeader() {
  log("");
  log(COLOR.bold("Territory Launcher") + COLOR.dim(" · BuzzLead"));
  log(COLOR.dim("─".repeat(48)));
}

function onProgress(step: ProgressStep) {
  if (opts.silent) return;
  const t = new Date().toISOString().slice(11, 19);
  switch (step.kind) {
    case "crawl":
      if (step.status === "start") log(COLOR.dim(t), "  Crawling site…");
      else if (step.data)
        log(
          COLOR.green("  ✓"),
          "Identified",
          COLOR.bold(step.data.companyName),
          COLOR.dim(`(${step.data.category})`)
        );
      break;
    case "intel":
      if (step.status === "start") log(COLOR.dim(t), "  Reading the market…");
      else if (step.data) {
        log(
          COLOR.green("  ✓"),
          "Intel:",
          COLOR.dim(
            `${step.data.buyerPains.length} pains, ${step.data.competitors.length} competitors, ${step.data.subreddits?.length ?? 0} subs`
          )
        );
        if (step.data.subreddits) {
          log(COLOR.dim("    searched ›"), step.data.subreddits.map((s) => `r/${s}`).join(" · "));
        }
      }
      break;
    case "campaigns":
      if (step.status === "start") log(COLOR.dim(t), "  Designing campaign angles…");
      else if (step.data)
        log(
          COLOR.green("  ✓"),
          "Generated",
          step.data.length,
          "angles:",
          COLOR.dim(step.data.map((c) => c.id).join(", "))
        );
      break;
    case "select-angle":
      log(
        COLOR.orange("  →"),
        "Using angle:",
        COLOR.bold(step.campaign.tag),
        COLOR.dim(`(${step.campaign.name})`)
      );
      break;
    case "prospects":
      if (step.status === "start")
        log(COLOR.dim(t), "  Sourcing prospects via AI Ark…");
      else if (step.data)
        log(
          COLOR.green("  ✓"),
          "Sourced",
          COLOR.bold(String(step.data.length)),
          "verified prospects"
        );
      break;
    case "copy":
      if (step.status === "start")
        log(COLOR.dim(t), "  Writing personalized copy…");
      else if (step.data)
        log(COLOR.green("  ✓"), "Wrote copy for", step.data.length, "prospects");
      break;
  }
}

async function main() {
  const missing = checkEnv();
  if (missing.length) {
    console.error(
      COLOR.red("Missing required env vars:"),
      missing.join(", ")
    );
    console.error(COLOR.dim("Copy .env.example to .env and fill in your keys."));
    process.exit(1);
  }

  if (!["pain", "competitor", "signal"].includes(opts.angle)) {
    console.error(
      COLOR.red("Invalid --angle:"),
      opts.angle,
      COLOR.dim("(must be pain | competitor | signal)")
    );
    process.exit(1);
  }

  printHeader();
  log(COLOR.dim("  URL:    "), opts.url);
  log(COLOR.dim("  Angle:  "), opts.angle);
  log(COLOR.dim("  Count:  "), opts.count);
  if (opts.icp) log(COLOR.dim("  ICP:    "), opts.icp);
  log("");

  const started = Date.now();

  try {
    const result = await runTerritory({
      url: opts.url,
      icpOverride: opts.icp,
      angle: opts.angle as "pain" | "competitor" | "signal",
      count: opts.count,
      onProgress,
    });

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const csv = buildCsv(result.prospects, result.selectedCampaign);
    if (existsSync(opts.out)) {
      log(COLOR.dim("  (overwriting existing file)"));
    }
    writeFileSync(opts.out, csv, "utf-8");
    log("");
    log(
      COLOR.green("Done in"),
      COLOR.bold(`${elapsed}s`),
      COLOR.dim("·"),
      `${result.prospects.length} prospects written to`,
      COLOR.bold(opts.out)
    );
    log("");
    log(
      COLOR.dim("Want this run at scale? →"),
      COLOR.orange("https://buzzlead.io")
    );
    log("");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("");
    console.error(COLOR.red("✗ Failed:"), msg);
    process.exit(1);
  }
}

void main();
