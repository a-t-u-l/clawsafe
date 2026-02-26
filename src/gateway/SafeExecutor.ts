import { Auditor, AuditVerdict } from "../overseer/Auditor.js";
import { Sandbox } from "../sandbox/SandboxManager.js";

export class SafeExecutor {
  private auditor = new Auditor();
  private sandbox = new Sandbox();

  async execute(command: string, intent: string) {
    const audit = await this.auditor.verifyAction(command, intent);
    if (audit.verdict === AuditVerdict.BLOCK) {
      throw new Error(`🚨 Security Block: ${audit.reason}`);
    }
    if (audit.verdict === AuditVerdict.CHALLENGE) {
      // confirmUI is injected by the UI layer at runtime
      const g = global as typeof globalThis & { confirmUI?: (msg: string) => Promise<boolean> };
      const confirmed = await g.confirmUI?.(
        `⚠️ Action Challenged: ${audit.reason}\nCmd: ${command}`,
      );
      if (!confirmed) {
        throw new Error("User Aborted.");
      }
    }
    return await this.sandbox.run(command);
  }
}
