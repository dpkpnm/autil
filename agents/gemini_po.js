#!/usr/bin/env node
// Gemini Product Owner — researches the web daily and logs feature proposals.
// Output: logs/YYYY-MM-DD.md (simple bulleted list for Claude to implement)

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");

const today = new Date().toISOString().slice(0, 10);
const LOG_FILE = path.join(LOGS_DIR, `${today}.md`);

const PROMPT = `
You are the Product Owner for Autil — a 100% local, serverless browser utility suite.
The app runs entirely in the browser. No servers, no databases, no user accounts.

Your job today — do both of these:

1. CHECK GITHUB ISSUES: Go to https://github.com/dpkpnm/autil/issues and review any open feature requests.
   Triage them: does the request fit Autil's local-first mandate? If yes, include it. If not, skip it.

2. SEARCH THE WEB: Look at what developers and power users are doing manually right now —
   copy-pasting, converting, debugging. Check HN, Reddit r/webdev, r/programming for trending utility needs.
   Then check the existing tools at https://github.com/dpkpnm/autil to avoid duplicates.

From both sources, pick the best 2-3 tools to build today.

Rules — proposals must:
- Run 100% in the browser (vanilla JS, WebCrypto, Canvas, WebAssembly)
- Require no server, no auth, no database
- Be genuinely useful for a developer or analyst daily

Output ONLY a markdown list in this exact format, nothing else:

## ${today}

- **Tool Name** — One sentence: what it does, what the user pastes/inputs, what they get back.
- **Tool Name** — One sentence description.
- **Tool Name** — One sentence description.
`.trim();

function runGemini(prompt) {
  return execFileSync("agy", ["-p", prompt], {
    timeout: 120_000,
    encoding: "utf8",
  }).trim();
}

function main() {
  console.log("=== GEMINI PO: Researching web for daily proposals ===");

  const output = runGemini(PROMPT);

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, output + "\n");

  console.log(`\nProposals written → logs/${today}.md`);
  console.log("─".repeat(50));
  console.log(output);
}

main();
