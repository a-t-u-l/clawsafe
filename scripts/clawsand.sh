#!/bin/bash
# 🧊 clawsand - The Sandbox Exec Wrapper

set -euo pipefail

# Parse args
INTERNET_ACCESS=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --internet-access)
      INTERNET_ACCESS=1
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -eq 0 ]]; then
  echo "Usage: clawsand [--internet-access] -- <command>"
  exit 1
fi

COMMAND="$@"
WORKSPACE_DIR="/Users/atul/Workspace/ClawSafe"
GUEST_WORKSPACE="/workspace"
IMAGE_NAME="clawsafe-runtime"

# Network settings
NETWORK_OPT="--network none"
if [[ $INTERNET_ACCESS -eq 1 ]]; then
  NETWORK_OPT="--network host" # For local development host routing to Ollama/proxy
  # In a strict production setting, this would point to a specialized proxy network.
fi

# We use Docker run to execute the command in an ephemeral container.
# -i: interactive (keep STDIN open even if not attached)
# --rm: automatically remove the container when it exits
# -v: mount the host workspace to /workspace in the guest
# -w: set the working directory to /workspace
# -u 1000:1000: run as non-root
docker run -i --rm \
  $NETWORK_OPT \
  -v "$WORKSPACE_DIR":"$GUEST_WORKSPACE" \
  -w "$GUEST_WORKSPACE" \
  -u 1000:1000 \
  "$IMAGE_NAME" /bin/bash -c "$COMMAND"
