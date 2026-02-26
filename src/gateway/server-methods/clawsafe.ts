import { execSync } from "node:child_process";
import { join } from "node:path";
import type { GatewayRequestHandlers } from "./types.js";

/**
 * ClawSafe Kill-Switch RPC Handler
 *
 * Registered as "clawsafe.killswitch" on the gateway.
 * When invoked via the UI, it runs `scripts/kill.sh` server-side
 * to immediately terminate all active Docker sandboxes and agent
 * processes. This is the correct alternative to the non-existent
 * `debug.call` / `debug.eval` method that was previously attempted.
 *
 * Security: This handler should only be called by authenticated
 * gateway clients (enforced by the gateway's token auth layer).
 */
export const clawsafeHandlers: GatewayRequestHandlers = {
  "clawsafe.killswitch": ({ respond }) => {
    try {
      const killScript = join(process.cwd(), "scripts", "kill.sh");
      execSync(`bash "${killScript}"`, { stdio: "pipe" });
      respond(
        true,
        { ok: true, message: "ClawSafe Kill-Switch activated. All sandboxes terminated." },
        undefined,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      respond(false, undefined, { code: "KILL_SWITCH_FAILED", message });
    }
  },
};
