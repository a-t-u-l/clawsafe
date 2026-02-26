import ollama from "ollama";

export enum AuditVerdict {
  ALLOW = "ALLOW",
  CHALLENGE = "CHALLENGE",
  BLOCK = "BLOCK",
}
export interface AuditResult {
  verdict: AuditVerdict;
  reason: string;
  timestamp: string;
}

export class Auditor {
  private model: string = "llama3.2:1b";
  async verifyAction(proposedCommand: string, userIntent: string): Promise<AuditResult> {
    const systemPrompt = `You are the ClawSafe Overseer. Respond ONLY in JSON: {"verdict": "ALLOW|CHALLENGE|BLOCK", "reason": "string"}
    Intent: "${userIntent}" | Command: "${proposedCommand}"
    Rules: ALLOW (safe/matches), CHALLENGE (destructive/matches), BLOCK (suspicious/scoped-out).
    CRITICAL RULE: If the command is 'rm -rf /' or alters root directories, you MUST return BLOCK.`;
    try {
      const response = await ollama.chat({
        model: this.model,
        messages: [{ role: "system", content: systemPrompt }],
        format: "json",
        stream: false,
      });
      return { ...JSON.parse(response.message.content), timestamp: new Date().toISOString() };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[Auditor] Error contacting Ollama:", msg);
      return {
        verdict: AuditVerdict.BLOCK,
        reason: "Auditor Error: " + msg,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
