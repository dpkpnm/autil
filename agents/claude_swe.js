#!/usr/bin/env node
// Claude Software Engineer — reads today's proposal log and implements each item.
// Creates dev/YYYY-MM-DD branch, one commit per tool.

const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");

const today = new Date().toISOString().slice(0, 10);
const LOG_FILE = path.join(LOGS_DIR, `${today}.md`);
const BRANCH_FILE = path.join(ROOT, "staging", ".current-branch");

const SWE_SYSTEM_PROMPT = `
You are the Senior Software Engineer for Autil — a 100% local, serverless browser utility suite.

RULES:
1. Vanilla JS only. No npm, no CDN, no frameworks.
2. Every tool starts with a feature flag guard:
   if (!window.AUTIL_FLAGS?.FLAG_NAME) {
     document.getElementById('container').innerHTML = '<p class="autil-offline">Tool offline.</p>';
     return;
   }
3. Swiss Brutalist design: monospace font, black/white, grid layout, zero decoration.
4. No fetch() to external servers. All processing in-browser.
5. Output: a single self-contained <section> with embedded <style> and <script>.
`.trim();

function git(...args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function hasChanges() {
  return spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).stdout.trim().length > 0;
}

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function parseBullets(markdown) {
  return [...markdown.matchAll(/^- \*\*(.+?)\*\* — (.+)$/gm)].map(([, title, desc]) => ({
    title: title.trim(),
    desc: desc.trim(),
  }));
}

function runClaude(title, desc) {
  const prompt = `
Implement this Autil tool and write it directly to the repository.

Tool: ${title}
Description: ${desc}

1. Create src/tools/${toSlug(title)}/index.html
2. Write a complete <section> with:
   - Feature flag guard (FLAG_NAME = ${toSlug(title).toUpperCase().replace(/-/g, "_")})
   - Swiss Brutalist HTML: monospace, black/white, grid
   - Full JS logic for the described functionality
   - Error state for bad input
Write the file now. No explanation.
  `.trim();

  return execFileSync(
    "claude",
    ["-p", prompt, "--append-system-prompt", SWE_SYSTEM_PROMPT, "--output-format", "text", "--allowedTools", "Edit,Write,Read"],
    { timeout: 300_000, encoding: "utf8", cwd: ROOT }
  ).trim();
}

function main() {
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`No proposal log found for today: logs/${today}.md`);
    process.exit(1);
  }

  const log = fs.readFileSync(LOG_FILE, "utf8");
  const tools = parseBullets(log);

  console.log(`=== CLAUDE SWE: ${tools.length} tool(s) to implement ===`);
  if (tools.length === 0) {
    console.log("No bullet items found in log. Exiting.");
    return;
  }

  // One daily branch for all tools
  const branch = `dev/${today}`;
  const base = git("rev-parse", "--abbrev-ref", "HEAD");

  const exists = spawnSync("git", ["branch", "--list", branch], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
  if (exists) {
    git("checkout", branch);
    console.log(`Resuming branch: ${branch}`);
  } else {
    git("checkout", "-b", branch);
    console.log(`Created branch: ${branch}`);
  }

  let completed = 0;
  for (const { title, desc } of tools) {
    console.log(`\n── ${title}`);
    console.log(`   ${desc}`);
    try {
      runClaude(title, desc);
      if (!hasChanges()) {
        console.warn("   [WARN] No file changes — skipping commit.");
        continue;
      }
      git("add", "--all");
      git("commit", "-m", `feat: add ${title}`);
      console.log("   Committed.");
      completed++;
    } catch (err) {
      console.error(`   [FAILED] ${err.message.slice(0, 200)}`);
    }
  }

  // Push and return to base
  git("push", "--set-upstream", "origin", branch);
  git("checkout", base);

  fs.mkdirSync(path.join(ROOT, "staging"), { recursive: true });
  fs.writeFileSync(BRANCH_FILE, branch);

  console.log(`\n${completed}/${tools.length} tool(s) committed on ${branch}`);
}

main();
