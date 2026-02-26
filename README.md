> [!NOTE]
> **🚧 ClawSafe is currently under active development.** Interfaces, configuration formats, and security behaviours may change without notice.

# 🛡️ ClawSafe — Hardened AI Execution Gateway

**ClawSafe** is a security-hardened fork of [OpenClaw](https://github.com/openclaw/openclaw). Its mission is **Overseer-Audited Ephemeral Sandboxing**: every LLM-driven command is intercepted, audited by a local offline model, and only then routed into a disposable Docker container — completely isolated from the host system.

> Built on top of `a-t-u-l/clawsafe` fork of OpenClaw `v1.0.0-hardened`.

---

## Mission Statement

> _Your personal AI assistant — with security built in._

ClawSafe ensures that no AI-generated command can touch your host system without:

1. Passing **static guardrail checks** (blocklist in `scripts/guardrails.json`)
2. Being **audited by the local Ollama LLM** (the Overseer)
3. Running inside an **ephemeral Docker container** (the Sandbox)

---

## Architecture

```
User / Channel Input
        │
        ▼
┌──────────────────────────────────┐
│          Gateway (Port 18789)    │
│     ws://127.0.0.1:18789         │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│   SafeExecutor  (Gatekeeper)     │  src/gateway/SafeExecutor.ts
│  Captures command + intent       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Overseer / Auditor  (Brain)    │  src/overseer/Auditor.ts
│  Local Ollama LLM audit          │
│  Verdicts: ALLOW / CHALLENGE /   │
│            BLOCK                 │
└──────┬───────────────────────────┘
       │ ALLOW only
       ▼
┌──────────────────────────────────┐
│   SandboxManager  (Cage)         │  src/sandbox/SandboxManager.ts
│  Ephemeral Docker container      │
│  Non-privileged (UID 1000)       │
│  Mounts only ./workspace         │
└──────────────────────────────────┘
```

---

## Core Components

### 1. The Overseer (Brain)

- **Path:** `src/overseer/Auditor.ts`
- **Model:** Local Ollama LLM (e.g. `llama3.2:1b` on low-RAM, `llama3.1` on 32GB+)
- **Role:** Analyzes `userIntent` vs `proposedCommand`, outputs a deterministic `AuditVerdict`.
- **Verdicts:** `ALLOW`, `CHALLENGE`, `BLOCK`

### 2. The Sandbox (Cage)

- **Paths:** `src/sandbox/SandboxManager.ts`, `Dockerfile.runtime`
- **Engine:** Docker Daemon
- **Isolation:**
  - Non-privileged execution: `useradd -r -m -u 1000 clawagent`
  - Host path isolation: only mounts `$(pwd)/workspace` → `/workspace`

### 3. The Gateway Hook (Gatekeeper)

- **Path:** `src/gateway/SafeExecutor.ts`
- **Pipeline:**
  1. Capture command + intent from the agent execution path
  2. Query `Auditor.verifyAction()`
  3. **BLOCK** → reject immediately
  4. **CHALLENGE** → yield to human for approval
  5. **ALLOW** → route to `Sandbox.run()`

### 4. Kill Switch

- **UI Button:** "INITIATE KILL-SWITCH" in the ClawSafe Security Gateway dashboard
- **Gateway RPC:** `clawsafe.killswitch` (registered in `src/gateway/server-methods/clawsafe.ts`)
- **Script:** `scripts/kill.sh` — tears down all Docker containers and agent processes

---

## Prerequisites

- **Node ≥ 22**
- **Docker** (running daemon)
- **Ollama** (running locally on `http://127.0.0.1:11434`)

---

## Setup

### 1. Pull a local model

```bash
# Minimum required — must support tool/function calling:
ollama pull llama3.1

# Any other tool-calling capable model also works, e.g.:
# ollama pull mistral-nemo
# ollama pull qwen2.5:7b
```

> ⚠️ **Tool-calling is required.** The Overseer relies on structured function calls to return `ALLOW/CHALLENGE/BLOCK` verdicts. Models without tool-calling support (e.g. `llama3.2:1b`) will respond in plain text and the Overseer verdict parsing will fail — commands will not be audited correctly.

> 💾 **Memory note:** `llama3.1` (8B) requires ~22 GB virtual memory. On machines with < 32 GB RAM, Ollama may swap heavily and cause gateway timeouts. Consider a smaller tool-calling model such as `qwen2.5:7b` (~6 GB) on constrained hardware.

### 2. Configure the gateway

Edit `~/.openclaw/openclaw.json` (this is the **live runtime config**, not `config.json`):

```json
{
  "models": {
    "providers": {
      "ollama": {
        "apiKey": "ollama-local",
        "baseUrl": "http://127.0.0.1:11434",
        "models": [{ "id": "llama3.1", "label": "Llama 3.1 (local, tool-calling)" }]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/llama3.2:1b"
      }
    }
  }
}
```

### 3. Boot the sandbox environment

```bash
bash scripts/boot.sh
```

Asserts Docker + Ollama are running, then builds the container image.

### 4. Start the gateway

```bash
cd core-source
OLLAMA_API_KEY="ollama-local" npm run openclaw -- gateway --allow-unconfigured
```

The gateway starts on `ws://127.0.0.1:18789`. Open the **ClawSafe Security Gateway** dashboard at `http://127.0.0.1:18789`.

---

## Security Controls

### Guardrails (`scripts/guardrails.json`)

Static blocklist of forbidden command patterns. Evaluated **before** the Overseer is called.

### Whitelist (`scripts/whitelist.json`)

Allowed domains and IPs for outbound network requests from sandboxed agents.

### `GEMINI.md` (Workspace Constitution)

Operational guardrails for the ClawSafe Architect agent role. Enforces:

- Local-only AI inference (no cloud model calls for code auditing)
- Sandbox enforcement for all test/install operations
- Audit logging requirements for every new feature

---

## Key Files

| File                                     | Role                                            |
| ---------------------------------------- | ----------------------------------------------- |
| `src/overseer/Auditor.ts`                | LLM-based command audit (ALLOW/CHALLENGE/BLOCK) |
| `src/gateway/SafeExecutor.ts`            | Execution interceptor — the Gatekeeper          |
| `src/gateway/server-methods/clawsafe.ts` | `clawsafe.killswitch` RPC handler               |
| `src/sandbox/SandboxManager.ts`          | Docker container lifecycle                      |
| `Dockerfile.runtime`                     | Non-privileged container image                  |
| `scripts/boot.sh`                        | Zero-trust environment bootstrap                |
| `scripts/kill.sh`                        | Emergency kill switch script                    |
| `scripts/guardrails.json`                | Static command blocklist                        |
| `scripts/whitelist.json`                 | Outbound network allowlist                      |
| `manifest.md`                            | Architecture manifest and component inventory   |
| `TESTING_WITH_LOCAL_MODEL.md`            | Validated local Ollama setup guide              |

---

## Local Model Reference

| Model           | RAM Required | Tool-Calling | Use Case                                                              |
| --------------- | ------------ | ------------ | --------------------------------------------------------------------- |
| `llama3.1` (8B) | ~22 GB virt  | ✅ Yes       | **Recommended minimum** — full Overseer verdict parsing               |
| `qwen2.5:7b`    | ~6 GB        | ✅ Yes       | Good alternative on machines with 8–16 GB RAM                         |
| `mistral-nemo`  | ~8 GB        | ✅ Yes       | Another capable tool-calling alternative                              |
| `llama3.2:1b`   | ~2–4 GB      | ❌ No        | ⚠️ Dev/testing workaround only — Overseer audit **will not function** |

> **Tool-calling is mandatory.** The Overseer parses structured JSON function calls from the model to issue `ALLOW`, `CHALLENGE`, or `BLOCK` verdicts. A non-tool-calling model will produce plain text that cannot be parsed, silently bypassing the audit gate.

---

## Development

```bash
git clone https://github.com/a-t-u-l/clawsafe.git
cd clawsafe/core-source

pnpm install
pnpm ui:build
pnpm build

# Dev loop with auto-reload
pnpm gateway:watch
```

---

## What Was Removed From Upstream OpenClaw

The following upstream sections are **not applicable** to ClawSafe and have been intentionally omitted:

| Removed Section                                  | Reason                                                    |
| ------------------------------------------------ | --------------------------------------------------------- |
| Sponsors (OpenAI, Blacksmith)                    | ClawSafe is local-first; no cloud sponsor dependency      |
| Multi-channel inbox (WhatsApp, Telegram, Slack…) | ClawSafe is a security gateway, not a messaging assistant |
| Voice Wake / Talk Mode / ElevenLabs              | Not part of the security mission                          |
| macOS app / iOS node / Android node              | Companion apps are out of scope                           |
| ClawHub skill registry                           | External skill pulls contradict the zero-trust model      |
| Star History chart                               | Upstream vanity metric                                    |
| Molty / "EXFOLIATE!" branding                    | Upstream persona, replaced by ClawSafe identity           |
| 500+ contributor avatar block                    | Upstream community; ClawSafe is a fork                    |
| Tailscale Serve/Funnel remote access             | Not a security-relevant configuration for this fork       |
| Agent-to-Agent (`sessions_*`) docs               | Not used in ClawSafe's sandboxed execution model          |
| Development channels (stable/beta/dev)           | ClawSafe ships from source, not npm                       |

---

## License

MIT — based on the OpenClaw upstream. See [LICENSE](LICENSE).
