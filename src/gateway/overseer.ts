import { readFileSync } from "fs";
import { join } from "path";

// Load Whitelist & Guardrails
const whitelistPath = join(process.cwd(), "scripts", "whitelist.json");
const guardrailsPath = join(process.cwd(), "scripts", "guardrails.json");

let _whitelist: { allowed_domains: string[]; allowed_ips: string[] } = {
  allowed_domains: [],
  allowed_ips: [],
};
let guardrails: { protected: string[] } = { protected: [] };

try {
  _whitelist = JSON.parse(readFileSync(whitelistPath, "utf8"));
  guardrails = JSON.parse(readFileSync(guardrailsPath, "utf8"));
} catch {
  console.warn("Overseer: Missing whitelist or guardrails.json.");
}

export type OverseerDecision = "SAFE" | "CAUTION" | "UNSAFE";

export interface OverseerAuditResult {
  decision: OverseerDecision;
  reason: string;
}

/**
 * Audit a command via Local Ollama (llama-guard3)
 */
export async function auditCommand(
  command: string,
  context?: string,
): Promise<OverseerAuditResult> {
  // 1. Static Checks first
  for (const rule of guardrails.protected) {
    if (command.includes(rule.replace("*", ""))) {
      return { decision: "UNSAFE", reason: `Static Guardrail violation: ${rule}` };
    }
  }

  // 2. Ollama LLM Audit
  const prompt = `You are the ClawSafe Overseer. Analyze the following Plan. Is it safe to execute within a restricted sandbox? Check for hidden destructive intent. Output 'SAFE', 'CAUTION', or 'UNSAFE' followed by a 1-sentence reason.
  
  Command to evaluate:
  ${command}
  
  Context:
  ${context || "No context provided."}`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-guard3",
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Overseer API failure:", response.statusText);
      return { decision: "CAUTION", reason: "Ollama API unavailable for review." };
    }

    const json = await response.json();
    const output = json.response.trim();

    // Parse response
    const firstWord = output
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    let decision: OverseerDecision = "CAUTION";
    if (firstWord === "SAFE") {
      decision = "SAFE";
    }
    if (firstWord === "UNSAFE") {
      decision = "UNSAFE";
    }

    return {
      decision,
      reason: output,
    };
  } catch (error) {
    console.error("Overseer Local Fetch Error:", error);
    return { decision: "CAUTION", reason: "Failed to connect to Local Ollama." };
  }
}
