# Autil

Drop anything. Get a tool for it. Nothing leaves your browser.

**[autil.app](https://autil.app)** · [Roadmap](ROADMAP.md) · [Issues](https://github.com/dpkpnm/autil/issues)

---

Autil is a browser utility kit that runs 100% locally. Paste a JWT, drop a CSV, type a cron expression — it figures out what you gave it and shows you something useful. No accounts. No servers. No uploads.

Every night, two AI agents wake up and ship new tools automatically.

---

## How it works

**Gemini** is the product manager. Each night it reads the [roadmap](ROADMAP.md), checks [GitHub issues](https://github.com/dpkpnm/autil/issues), and decides what to build next. It writes a short proposal log.

**Claude** is the engineer. It reads Gemini's proposal, writes the code, commits it, and pushes it live.

By morning, new tools are on [autil.app](https://autil.app).

```
You add an idea
    ↓
Gemini picks it up, decides what to build
    ↓
Claude writes the code and ships it
    ↓
Live by morning
```

---

## Want a tool built?

Two ways:

1. **Open a GitHub issue** — describe what you want. Gemini checks issues every night and picks the good ones.

2. **Edit [ROADMAP.md](ROADMAP.md)** — add a row to the table with `backlog` status. It stays there until Claude ships it, then flips to `shipped`.

That's it. No forms, no voting, no waiting list.

---

## What's already built

See [ROADMAP.md](ROADMAP.md) — every tool, its status, and the date it shipped.

---

## The one rule

Every tool must run entirely in your browser. If it needs a server, it doesn't belong here.
