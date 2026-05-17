// Jina Reader primary, plain-fetch HTML fallback. No paid Firecrawl path.

async function scrapeWithJina(url: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "text/plain",
      "X-Return-Format": "markdown",
    };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const res = await fetch(`https://r.jina.ai/${encodeURI(url)}`, { headers });
    if (!res.ok) return null;
    const text = await res.text();
    return text && text.trim().length >= 40 ? text.slice(0, 12000) : null;
  } catch {
    return null;
  }
}

async function scrapeWithFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BuzzLeadBot/1.0; +https://buzzlead.io)",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i)?.[1];
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000);
    const parts = [title, desc, ogDesc, text].filter(Boolean);
    return parts.length ? parts.join("\n\n") : null;
  } catch {
    return null;
  }
}

export async function scrapeMarkdown(url: string): Promise<string> {
  const jina = await scrapeWithJina(url);
  if (jina) return jina;
  const fallback = await scrapeWithFetch(url);
  if (fallback) return fallback;
  throw new Error("We couldn't read that site. Try a different URL or paste your homepage.");
}
