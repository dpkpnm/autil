#!/usr/bin/env node
/**
 * Autil dual-agent orchestrator — nightly pipeline.
 *
 * Flow:
 *   1. Gemini PO  — triages open GitHub issues into task specs
 *   2. Claude SWE — implements all approved tasks on dev/YYYY-MM-DD branch
 *   3. Merge      — merges dev branch into master and pushes
 *
 * Usage:
 *   node agents/orchestrator.js            # full pipeline
 *   node agents/orchestrator.js --po-only  # triage only, no coding or merge
 *   node agents/orchestrator.js --no-merge # implement but skip auto-merge
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");
const RUN_LOG = path.join(LOGS_DIR, "run_log.md");
const today = new Date().toISOString().slice(0, 10);
const DAILY_LOG = path.join(ROOT, "logs", `${today}.md`);
const BRANCH_FILE = path.join(ROOT, "staging", ".current-branch");

const poOnly = process.argv.includes("--po-only");
const noMerge = process.argv.includes("--no-merge");

function log(msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(RUN_LOG, line + "\n");
}

function runStage(name, scriptPath) {
  log(`START → ${name}`);
  const result = spawnSync("node", [scriptPath], { stdio: "inherit", cwd: ROOT });
  if (result.status !== 0) {
    log(`FAILED → ${name} (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
  log(`DONE  → ${name}`);
}

function git(...args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function mergeToMaster(devBranch) {
  const baseBranch = (() => {
    try { git("rev-parse", "--verify", "master"); return "master"; } catch { return "main"; }
  })();

  log(`Merging ${devBranch} → ${baseBranch}`);
  git("checkout", baseBranch);
  git("merge", "--no-ff", devBranch, "-m", `release: ${devBranch} daily batch`);
  git("push", "origin", baseBranch);
  git("push", "origin", devBranch); // keep the dev branch visible on remote
  log(`Merged and pushed → ${baseBranch}`);
}


function main() {
  log("=".repeat(60));
  log("AUTIL PIPELINE START");
  log("=".repeat(60));

  // Stage 1: Gemini PO — research web, write daily proposal log
  runStage("Gemini PO: Daily Research", path.join(__dirname, "gemini_po.js"));

  if (!fs.existsSync(DAILY_LOG) || poOnly) {
    if (!fs.existsSync(DAILY_LOG)) log("No proposal log written — nothing to implement.");
    if (poOnly) log("--po-only: skipping implementation and merge.");
    log("=".repeat(60));
    return;
  }

  // Stage 2: Claude SWE implementation on daily branch
  runStage("Claude SWE: Feature Implementation", path.join(__dirname, "claude_swe.js"));

  // Stage 3: Merge to master
  if (noMerge) {
    log("--no-merge: skipping auto-merge. Review the dev branch before merging manually.");
    log("=".repeat(60));
    return;
  }

  const devBranch = fs.existsSync(BRANCH_FILE)
    ? fs.readFileSync(BRANCH_FILE, "utf8").trim()
    : `dev/${new Date().toISOString().slice(0, 10)}`;

  try {
    mergeToMaster(devBranch);
  } catch (err) {
    log(`MERGE FAILED: ${err.message}`);
    log("Fix conflicts on the dev branch, then merge manually.");
    process.exit(1);
  }

  log("=".repeat(60));
  log("PIPELINE COMPLETE — production updated.");
  log("=".repeat(60));
}

main();
