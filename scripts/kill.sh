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
