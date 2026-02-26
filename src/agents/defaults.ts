// Defaults for agent metadata when upstream does not supply them.
// Model id uses pi-ai's built-in Anthropic catalog.
export const DEFAULT_PROVIDER = "ollama";
export const DEFAULT_MODEL = "llama3.2:1b";

// Local (ClawSafe — maps shorthand aliases to local Ollama models)
export const LOCAL_MODEL_ALIASES = {
  local: "ollama/llama3.2:1b",
  "local-large": "ollama/llama3.1", // requires ≥32GB RAM;
};

// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
