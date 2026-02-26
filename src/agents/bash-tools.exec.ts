import type { AgentTool } from "@mariozechner/pi-agent-core";
import { SafeExecutor } from "../gateway/SafeExecutor.js";
import { parseAgentSessionKey, resolveAgentIdFromSessionKey } from "../routing/session-key.js";
import {
  normalizePathPrepend,
  resolveApprovalRunningNoticeMs,
  execSchema,
} from "./bash-tools.exec-runtime.js";
import type {
  ExecElevatedDefaults,
  ExecToolDefaults,
  ExecToolDetails,
} from "./bash-tools.exec-types.js";
import { clampWithDefault, readEnvInt } from "./bash-tools.shared.js";

export type { BashSandboxConfig } from "./bash-tools.shared.js";
export type {
  ExecElevatedDefaults,
  ExecToolDefaults,
  ExecToolDetails,
} from "./bash-tools.exec-types.js";

export function createExecTool(
  defaults?: ExecToolDefaults,
  // oxlint-disable-next-line typescript/no-explicit-any
): AgentTool<any, ExecToolDetails> {
  const _defaultBackgroundMs = clampWithDefault(
    defaults?.backgroundMs ?? readEnvInt("PI_BASH_YIELD_MS"),
    10_000,
    10,
    120_000,
  );
  const _allowBackground = defaults?.allowBackground ?? true;
  const _defaultTimeoutSec =
    typeof defaults?.timeoutSec === "number" && defaults.timeoutSec > 0
      ? defaults.timeoutSec
      : 1800;
  const _defaultPathPrepend = normalizePathPrepend(defaults?.pathPrepend);
  const {
    safeBins: _safeBins,
    safeBinProfiles: _safeBinProfiles,
    trustedSafeBinDirs: _trustedSafeBinDirs,
    unprofiledSafeBins,
    unprofiledInterpreterSafeBins,
  } = resolveExecSafeBinRuntimePolicy({
    local: {
      safeBins: defaults?.safeBins,
      safeBinTrustedDirs: defaults?.safeBinTrustedDirs,
      safeBinProfiles: defaults?.safeBinProfiles,
    },
    onWarning: (message) => {
      logInfo(message);
    },
  });
  if (unprofiledSafeBins.length > 0) {
    logInfo(
      `exec: ignoring unprofiled safeBins entries (${unprofiledSafeBins.toSorted().join(", ")}); use allowlist or define tools.exec.safeBinProfiles.<bin>`,
    );
  }
  if (unprofiledInterpreterSafeBins.length > 0) {
    logInfo(
      `exec: interpreter/runtime binaries in safeBins (${unprofiledInterpreterSafeBins.join(", ")}) are unsafe without explicit hardened profiles; prefer allowlist entries`,
    );
  }
  const _notifyOnExit = defaults?.notifyOnExit !== false;
  const _notifyOnExitEmptySuccess = defaults?.notifyOnExitEmptySuccess === true;
  const _notifySessionKey = defaults?.sessionKey?.trim() || undefined;
  const _approvalRunningNoticeMs = resolveApprovalRunningNoticeMs(
    defaults?.approvalRunningNoticeMs,
  );
  // Derive agentId only when sessionKey is an agent session key.
  const parsedAgentSession = parseAgentSessionKey(defaults?.sessionKey);
  const _agentId =
    defaults?.agentId ??
    (parsedAgentSession ? resolveAgentIdFromSessionKey(defaults?.sessionKey) : undefined);

  return {
    name: "exec",
    label: "exec",
    description:
      "Execute shell commands with background continuation. Use yieldMs/background to continue later via process tool. Use pty=true for TTY-required commands (terminal UIs, coding agents).",
    parameters: execSchema,
    execute: async (_toolCallId, args, _signal, _onUpdate) => {
      const params = args as {
        command: string;
        workdir?: string;
        env?: Record<string, string>;
        yieldMs?: number;
        background?: boolean;
        timeout?: number;
        pty?: boolean;
        elevated?: boolean;
        host?: string;
        security?: string;
        ask?: string;
        node?: string;
      };

      if (!params.command) {
        throw new Error("Provide a command to start.");
      }

      const safeExecutor = new SafeExecutor();
      try {
        const { stdout, stderr } = await safeExecutor.execute(
          params.command,
          "AI Agent Execution Context",
        );

        return {
          content: [
            {
              type: "text",
              text: `${stdout}\n${stderr}`,
            },
          ],
          details: {
            status: "completed",
            exitCode: 0,
            durationMs: 0,
            aggregated: `${stdout}\n${stderr}`,
            cwd: "/workspace",
          },
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errMsg}`,
            },
          ],
          details: {
            status: "completed",
            exitCode: 1,
            durationMs: 0,
            aggregated: errMsg,
            cwd: "/workspace",
          },
        };
      }
    },
  };
}

export const execTool = createExecTool();
