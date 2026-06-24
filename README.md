# Autil

Drop anything. Get a tool for it. Nothing leaves your browser.

**[autil.app](https://autil.app)** · [Roadmap](ROADMAP.md) · [Issues](https://github.com/dpkpnm/autil/issues)

---

Modern web development has convinced us that even the simplest task requires a database, a serverless backend, user accounts, and a recurring subscription.

Autil is an experiment to prove the exact opposite: a single, static browser tab running entirely client-side, continually expanded by an autonomous AI agent, is enough to handle almost any daily digital utility.

---

## The browser is already an operating system

Over the last twenty years, while software moved to the cloud, the browser quietly became powerful enough to replace it:

- **WebCrypto** — hardware-accelerated encryption and hashing, locally
- **WebAssembly** — run heavy native binaries (SQLite, FFmpeg) inside a tab
- **IndexedDB** — persistent storage on the user's own drive
- **Canvas / WebGL** — native graphics processing, no server needed
- **WebRTC** — peer-to-peer data channels with no intermediary

Pair that with a single-file codebase and an autonomous AI engineer, and you get something new: software that grows on its own, costs nothing to run, and never touches your data.

---

## How it works

**Gemini** is the product manager. Each night it reads the [roadmap](ROADMAP.md), checks [GitHub issues](https://github.com/dpkpnm/autil/issues), and decides what to build next.

**Claude** is the engineer. It reads Gemini's proposal, writes the code, commits it, and pushes it live.

```
Idea added to roadmap or GitHub issue
    ↓
Gemini picks it up and decides what to build
    ↓
Claude writes the code and ships it
    ↓
Live by morning
```

---

## Want a tool built?

Open a [GitHub issue](https://github.com/dpkpnm/autil/issues) and describe what you want. Gemini checks issues every night and picks the good ones.

---

## The one rule

Every tool must run entirely in your browser. If it needs a server, it doesn't belong here.
