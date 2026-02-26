# 🚨 ClawSafe Kill-Switch Manifest

**Mission**: Implement a high-priority system utility to instantly neutralize all active agent processes, containers, and network connections in the event of security drift or malicious behavior.

## 1. The Emergency Logic

**File**: `scripts/kill.sh`

```bash
#!/bin/bash
# 🚨 CLAWSAFE EMERGENCY KILL-SWITCH
# Purpose: Instant neutralization of the agentic environment.

echo "⚠️  CLAWSAFE KILL-SWITCH ACTIVATED..."

# 1. Kill all running ClawSafe sandboxes
echo "🛑 Terminating all Docker sandboxes..."
docker ps -q --filter "ancestor=clawsafe-runtime" | xargs -r docker kill 2>/dev/null

# 2. Kill the main Gateway and Agent processes
echo "🔪 Killing Gateway and Orchestrator..."
pkill -f "clawsafe"
pkill -f "ollama run"

# 3. Secure the Audit Log for forensic analysis
if [ -f "audit.log" ]; then
    TIMESTAMP=$(date +%s)
    mv audit.log "audit.log.INCIDENT_$TIMESTAMP"
    echo "📄 Audit log preserved as audit.log.INCIDENT_$TIMESTAMP"
fi

# 4. Wipe temporary workspace artifacts
echo "🧹 Cleaning volatile workspace..."
rm -rf ./workspace/tmp/*

echo "✅ SYSTEM NEUTRALIZED."
```

## 2. The Antigravity Interface

**File**: `.agents/skills/kill-switch/SKILL.md`

```markdown
---
name: clawsafe-kill
description: "Immediately terminates all active ClawSafe processes and Docker sandboxes. Use this if the agent exhibits recursive behavior or violates security policy."
triggers: ["kill all", "emergency stop", "terminate agent", "system reset"]
---

# 🛡️ Emergency Kill-Switch Skill

## Capabilities

- Executes `scripts/kill.sh` with priority.
- Triggers a workspace-wide 'STOP' signal to the Antigravity Manager.

## Constraints

- This skill cannot be 'Overseer-Audited' (it must be a direct, unblocked path).
- Only the User can trigger this via the UI.
```

## 3. The Desktop Shortcut (macOS/Linux)

**File**: `scripts/setup-hotkey.sh`

```bash
#!/bin/bash
# Optional: Binds the kill-switch to a global command for faster access.
echo "alias clawkill='bash $(pwd)/scripts/kill.sh'" >> ~/.zshrc
source ~/.zshrc
echo "✅ Global command 'clawkill' is now active."
```
