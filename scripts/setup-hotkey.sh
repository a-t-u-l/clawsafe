#!/bin/bash
# Optional: Binds the kill-switch to a global command for faster access.
echo "alias clawkill='bash $(pwd)/scripts/kill.sh'" >> ~/.zshrc
source ~/.zshrc
echo "✅ Global command 'clawkill' is now active."
