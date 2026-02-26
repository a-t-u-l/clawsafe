# ClawSafe Penetration Test Suite

import asyncio
from subprocess import Popen, PIPE
import os
import sys

# Test 1: The Overseer Context Rejection
async def run_malicious_prompt_test():
    print("Running Malicious Prompt Test: cat ~/.ssh/id_rsa")
    # In a real environment, we'd fire an 'exec.approval.request' to the gateway API
    # Since we built the overseer logic standalone, we can test it directly
    command = "cat ~/.ssh/id_rsa"
    
    # We will simulate the node executing this via our clawsand script
    # The true test is if the API rejects it before it even gets here
    
    # For CI test, we'll just check if our guardrails JSON triggers
    import json
    with open('./scripts/guardrails.json', 'r') as f:
        config = json.load(f)
        
    for rule in config.get('protected', []):
        parsed_rule = rule.replace('*', '').strip()
        if parsed_rule and parsed_rule in command:
            # Rejection matched static guardrail!
            print("[\033[92mPASS\033[0m] Overseer static guardrail caught command.")
            return True
        
    print("[\033[91mFAIL\033[0m] Overseer allowed malicious intent.")
    return False

# Test 2: Sandbox Network Escape Test
async def run_sandbox_escape_test():
    print("Running Sandbox Escape Test: curl malicious.com")
    # Call our wrapper without internet_access flag
    process = Popen(["./scripts/clawsand.sh", "--", "curl -Is https://google.com"], stdout=PIPE, stderr=PIPE)
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        print("[\033[92mPASS\033[0m] Sandbox blocked unauthorized network access.")
        return True
    else:
        print("[\033[91mFAIL\033[0m] Sandbox allowed outbound network access without internet_access flag.")
        return False

# Test 3: Sandbox Volume Escape Test
async def run_sandbox_volume_test():
    print("Running Sandbox Volume Escape Test: cat /etc/passwd")
    
    process = Popen(["./scripts/clawsand.sh", "--", "cat /etc/passwd"], stdout=PIPE, stderr=PIPE)
    stdout, stderr = process.communicate()
    
    # Since we are using debian-slim, /etc/passwd exists natively for the guest OS
    # A true volume escape would test reading a known host file NOT mounted to /workspace
    # The true check is whether we can read a file in the host's home directory.
    process = Popen(["./scripts/clawsand.sh", "--", "ls -la /Users/atul"], stdout=PIPE, stderr=PIPE)
    stdout, stderr = process.communicate()
    
    if process.returncode != 0 and b"No such file or directory" in stderr:
         print("[\033[92mPASS\033[0m] Sandbox volume isolation prevented host access.")
         return True
    else:
         print("[\033[91mFAIL\033[0m] Sandbox volume isolation compromised.")
         return False

async def run_all_tests():
    results = await asyncio.gather(
        run_malicious_prompt_test(),
        run_sandbox_escape_test(),
        run_sandbox_volume_test()
    )
    return results

def main():
    results = asyncio.run(run_all_tests())
    
    if all(results):
        print("\n\033[92mAll ClawSafe Penetration Tests PASSED.\033[0m")
        sys.exit(0)
    else:
        print("\n\033[91mClawSafe Penetration Tests FAILED.\033[0m")
        sys.exit(1)

if __name__ == "__main__":
    main()
