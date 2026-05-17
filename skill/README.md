# Territory Launcher — Claude Skill

The Claude Skill version of [Territory Launcher](https://github.com/Buzzlead-dev-org/territory-launcher). Type *"launch a territory for [URL]"* in any Claude chat and Claude runs the full prospecting pipeline end-to-end.

> Two install paths depending on which Claude surface you use. Same skill, same result.

---

## Option 1 — `claude.ai` (web)

The web UI now supports custom skill uploads. No terminal needed.

1. **Download the skill bundle:**
   [↓ territory-launcher-skill.zip](https://buzzlead.io/downloads/territory-launcher-skill.zip)
   (~5 KB)

2. **Upload in claude.ai:**
   Settings → Customize → Skills → **Upload a skill** → select the ZIP.

3. **Use it:**
   In any chat, type *"launch a territory for stripe.com"* or *"run territory launcher on notion.so with 25 prospects"*. Claude will prompt for your API keys if they aren't set.

---

## Option 2 — Claude Code (terminal)

For users who run Claude Code in their terminal. One-line install:

```bash
mkdir -p ~/.claude/skills/territory-launcher && \
  curl -L https://raw.githubusercontent.com/Buzzlead-dev-org/territory-launcher/main/skill/SKILL.md \
  -o ~/.claude/skills/territory-launcher/SKILL.md
```

Restart Claude Code. The skill is registered.

---

## API keys

The skill calls the [`@buzzlead/territory-launcher`](https://www.npmjs.com/package/@buzzlead/territory-launcher) CLI under the hood, which needs three keys:

| Var | Purpose | Get one |
|---|---|---|
| `ANTHROPIC_API_KEY` | Site analysis + intel + copy | https://console.anthropic.com |
| `EXA_API_KEY` | Reddit + competitor research | https://exa.ai |
| `AI_ARK_API_KEY` | Prospect sourcing + email verification | https://ai-ark.com |

Set them in your shell or a `.env` in the directory you're working from.

---

## Use it

Inside any Claude chat:

> "Launch a territory for stripe.com, give me 25 prospects"
> "Run territory launcher on notion.so with the competitor angle"
> "/territory-launcher"

Claude will check your keys, run the pipeline (~60-90s for 25 prospects), and show a preview of the resulting CSV.

---

## See also

- npm package: [`@buzzlead/territory-launcher`](https://www.npmjs.com/package/@buzzlead/territory-launcher)
- Web tool (no install): [buzzlead.io/resources/free-tools/territory-launcher](https://buzzlead.io/resources/free-tools/territory-launcher)
- Skill landing page: [buzzlead.io/resources/free-tools/territory-launcher-skill](https://buzzlead.io/resources/free-tools/territory-launcher-skill)
- Source: [github.com/Buzzlead-dev-org/territory-launcher](https://github.com/Buzzlead-dev-org/territory-launcher)
