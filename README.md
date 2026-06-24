# AUTIL / AUTO-UTIL

DROP/PASTE ANYTHING. WE FIND A UTIL FOR IT.
100% LOCAL. NO DEPS. NO DATA TRANSMISSION.

Autil is a public engineering experiment demonstrating a new paradigm of Post-Cloud Software: an infinite local utility suite housed entirely inside a single, serverless browser tab, built and expanded continuously by a dual-agent AI development team.

## 1. THE EXPERIMENT

The modern web is bloated with heavy, subscription-based SaaS tools that harvest user data just to perform basic utility tasks. Autil proves that modern browser APIs—such as WebCrypto, HTML5 Canvas, WebAssembly (WASM), and WebRTC—are powerful enough to handle 95% of daily data wrangling tasks locally, securely, and with exactly $0 of server-side scaling overhead.

To scale the tool, we do not write the code. A team of two autonomous AI agents reads user requests, plans features, writes browser-native code, runs automated QA validation checks, and deploys updates once a day.

## 2. THE DUAL-AGENT RUNTIME PIPELINE

Every 24 hours at 23:45 UTC, a lightweight local staging runner executes our autonomous development and deployment loop:

```
┌────────────────────────────────────────────────────────┐
│             1. USER INPUTS / GITHUB ISSUES             │
│  User requests a new micro-tool or files suggestion.  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             2. GEMINI (THE PRODUCT OWNER)              │
│  Triage and scoping. If request fits Local-First,      │
│  determines complexity, assigns T-shirt size (S-XL),   │
│  and schedules task. Otherwise, writes Rejection Log.  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             3. CLAUDE (THE SOFTWARE ENGINEER)          │
│  In-progress coding. Appends functional javascript,    │
│  respecting Swiss Brutalist parameters.                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             4. DETERMINISTIC QA VALIDATIONS            │
│  Runs HTML structure validators and Puppeteer tests.   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             5. DAILY MIDNIGHT GIT RELEASE              │
│  Merges staging to master, deploys instantly to        │
│  production CDN on FastComet.                          │
└────────────────────────────────────────────────────────┘
```

## 3. GEMINI PO TRIAGE & REJECTION POLICY

Our automated PO (Gemini) is highly protective of Autil's structural core. If a proposed feature request violates our architectural mandates, the request is immediately rejected, unstaged, and written to the public Rejection Logs.

**Rejection Triggers:**

- **Centralized Data Storage:** Any feature suggesting user account databases, cloud-saved files, or real-time central states.
- **Out-of-Scope Bloat:** Social media feeds, AI chatbots, or non-utility SaaS applications.
- **Heavy Native Dependencies:** Features requiring heavy backend computation (such as machine-learning weights) that cannot run within browser WebAssembly.

## 4. T-SHIRT COMPLEXITY & CAPACITY SYSTEM

Claude SWE operates on a strict daily capacity budget of 10 Capacity Units (CU) per 24-hour development cycle. Gemini PO triages each approved feature, sizing its engineering complexity:

- **S (Small) — 1 to 2 CU:** Simple logic, string transformations, epoch times.
- **M (Medium) — 3 to 5 CU:** Multi-field inputs, basic data schemas, REST API integrations.
- **L (Large) — 6 to 8 CU:** Heavy data parsers, nested file system handles, tabular grid modifications.
- **XL (Extra Large) — 9 to 10 CU:** WebAssembly video/audio processing, real-time Canvas assets.

If the aggregate staged suggestions exceed 10 CU, additional features are automatically held back and scheduled in the next daily queue.

## 5. LIVE PRODUCTION KANBAN BOARD

```
LAST BATCH UPDATE: 2026-06-24 00:00:00 UTC // SYSTEM CAPACITY: 7/10 UNITS USED
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTIL STAGING KANBAN // AUTOMATED RELEASES PUSHED DAILY                    │
├───────────────┬────────────────────────┬───────────────────┬────────────────┤
│ BACKLOG       │ TRIAGED (GEMINI PO)    │ DEV (CLAUDE SWE)  │ PROD RELEASED  │
├───────────────┼────────────────────────┼───────────────────┼────────────────┤
│ [ ] JWT Sig   │ [ ] REGEX Sandbox      │ [M] URL Parser    │ [L] Spreadsheet│
│     Verifier  │     (Target: June 26)  │     Query Params  │     Grid Engine│
│               │     [Size: S, 2 CU]    │     [Size: M, 4]  │     Released   │
│               │                        │                   │                │
│ [ ] GeoIP     │ [ ] JWT Claims Clock   │                   │ [S] Crypt-Hash │
│     Resolver  │     (Target: June 25)  │                   │     Forge      │
│               │     [Size: S, 1 CU]    │                   │     Released   │
│               │                        │                   │                │
│ [ ] CSS Grid  │                        │                   │ [M] Temporal   │
│     Visualizer│                        │                   │     Calendar   │
│               │                        │                   │     Released   │
└───────────────┴────────────────────────┴───────────────────┴────────────────┘
```

**REJECTED PROPOSALS (PRESERVED IN LOGS):**

```
REJECTED [2026-06-24]: feature-request: user_login_feed
Reason: "Violates Local-First Privacy Mandate. Proposal requires centralized user
authentication databases, which breaks the local-first client-side sandbox constraint."

REJECTED [2026-06-23]: feature-request: ai_companion_chatbot
Reason: "Out of Scope. Autil is strictly a zero-friction offline data utility
sandbox, not an open-ended conversational wrapper."
```

## 6. SYSTEM FEATURE FLAGS (HUMAN OVERRIDE)

Because the AI agent continuously modifies the codebase, the human supervisor retains absolute override control. Every new module implemented by Claude is wrapped in a hard-coded Feature Flag.

If an automated release behaves unexpectedly in production, the operator can bypass code redeployments by sliding open Autil's Engine Flags Console and toggling the target module off. The live interface instantly degrades gracefully with a clean offline placeholder.

```
                      [ ENGINE FLAGS CONSOLE ]
┌───────────────────────────────┬──────────────┬─────────────────────────────┐
│ FLAG ID                       │ STATE        │ UTILITY                     │
├───────────────────────────────┼──────────────┼─────────────────────────────┤
│ SPREADSHEET_GRID_V1           │ [ ENABLED ]  │ Tabular CSV/TSV visualizer  │
│ TEMPORAL_CALENDAR_P2P         │ [ ENABLED ]  │ WebRTC shared schedule matrix│
│ CRYPTOGRAPHIC_DEVELOPER_KIT   │ [ ENABLED ]  │ Local JSON, JWT, Hash tools │
│ WASM_FFMPEG_TRANSCODER        │ [ DISABLED]  │ Video clipping and exports  │
└───────────────────────────────┴──────────────┴─────────────────────────────┘
```

## 7. BRING YOUR OWN CLOUD (BYOC) MONETIZATION

Autil represents the ultimate zero-overhead software business. On the free tier, users get access to our entire suite of local formats, compilers, and decoders.

For **Autil Pro ($29 lifetime)**, we unlock the Sovereign Sync Layer:

- **Zero Host Databases:** We do not host your files. Users save their persistent workspaces and custom dashboards directly to their own private GitHub repos, S3 Buckets, or Dropbox drives.
- **Zero Security Risk:** Because we do not store, process, or transmit your credentials to our servers, you are mathematically immune to database breaches and natively compliant with enterprise security standards.

## 8. CONTRIBUTE A SUGGESTION

Want our AI SWE Agent to build a tool for you?

1. Open a GitHub Issue using the template: `feature-request: [Your Tool Name]`
2. Clearly describe the desired client-side logic and interface requirements.
3. Our daily Gemini PO routine will triage your issue, structure the JSON Task Spec, and assign Claude SWE to implement, test, and release your feature within the next 24-hour cycle.
