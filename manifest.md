# ClawSafe Application Manifest

**Version**: `1.0.0-hardened`
**Mission**: Overseer-Audited Ephemeral Sandboxing Architecture

This manifest outlines the core security architecture implemented over the `a-t-u-l/clawsafe` fork of OpenClaw. This architecture intercepts all LLM-driven execution attempts, audits them via a local offline model, and securely routes them to an ephemeral container.

## 1. The Overseer (Brain)

- **Path:** `src/overseer/Auditor.ts`
- **Model:** `granite-guardian:8b` (Local via Ollama)
- **Role:** Analyzes the `userIntent` against the `proposedCommand` to output a deterministic JSON `AuditVerdict`.
- **Verdicts:** `ALLOW`, `CHALLENGE`, `BLOCK`.
- **Pre-Flight Hook:** OpenClaw executes all commands through `src/agents/bash-tools.exec.ts`. This was completely overhauled to require an audit via the `SafeExecutor` pipeline before spawning any process.

## 2. The Sandbox (Cage)

- **Path:** `src/sandbox/SandboxManager.ts` & `Dockerfile.runtime`
- **Role:** Guarantees all execution happens in temporary containers isolated from the host `Node` system.
- **Engine:** Docker Daemon.
- **Isolation:**
  - Non-privileged execution: `useradd -r -m -u 1000 clawagent`
  - Host Path Isolation: Only mounts `$(pwd)/workspace` to `/workspace`.

## 3. The Gateway Hook (The Gatekeeper)

- **Path:** `src/gateway/SafeExecutor.ts`
- **Integration:** Rewrote the OpenClaw execution path (`src/agents/bash-tools.exec.ts:createExecTool.execute()`) to intercept execution requests.
- **Enforcement Pipeline:**
  1. Captures generated command and intent.
  2. Queries `Auditor.verifyAction()`.
  3. Rejects on `BLOCK`.
  4. Yields to human on `CHALLENGE`.
  5. Routes to `Sandbox.run()` on `ALLOW`.

## Boot & Dependencies (Zero-Trust Setup)

- **Path:** `scripts/boot.sh`
- **Purpose:** Asserts presence of Docker and Ollama, pulls the `granite-guardian:8b` model structure, and builds the containerized environment prior to any node processes booting up.
- **Additional Local Tools Installed:** `ollama` added to `package.json` for lightweight synchronous Node.js integration to the local LLM daemon.
