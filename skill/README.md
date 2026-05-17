# Territory Launcher — Claude Skill

A Claude Code skill that wraps the `@buzzlead/territory-launcher` CLI. Ask Claude to "launch a territory for [URL]" and it runs the full pipeline end-to-end in your terminal.

## Install

Copy `SKILL.md` into your local skills directory:

```bash
mkdir -p ~/.claude/skills/territory-launcher
curl -L https://raw.githubusercontent.com/Buzzlead-dev-org/territory-launcher/main/skill/SKILL.md \
  -o ~/.claude/skills/territory-launcher/SKILL.md
```

That's it. Restart Claude Code (or your IDE plugin) and the skill is available.

## Set your API keys

The skill calls the CLI, which needs three keys in your environment:

```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
export EXA_API_KEY=xxx
export AI_ARK_API_KEY=xxx
```

Or put them in a `.env` file at the directory you're invoking from.

## Use it

Inside Claude Code:

> "Launch a territory for stripe.com, give me 25 prospects"
> "Run territory launcher on notion.so with the competitor angle"
> "/territory-launcher"

Claude will check your keys, run the CLI, and show you a preview of the resulting CSV.

## See also

- npm package: [`@buzzlead/territory-launcher`](https://www.npmjs.com/package/@buzzlead/territory-launcher)
- Web tool: [buzzlead.io/resources/free-tools/territory-launcher](https://buzzlead.io/resources/free-tools/territory-launcher)
- Source: [github.com/Buzzlead-dev-org/territory-launcher](https://github.com/Buzzlead-dev-org/territory-launcher)
