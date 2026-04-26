export function sanitizePromptInput(input: string): string {
  return input
    .replace(/<\/?(script|iframe|object|embed|form|input|textarea|style)\b[^>]*>/gi, "[REMOVED]")
    .replace(/javascript:/gi, "[REMOVED]")
    .replace(/on\w+\s*=/gi, "data-removed=")
    .replace(/\b(SYSTEM|INSTRUCTION|ASSISTANT|USER)\s*:\s*/gi, (_match) => {
      const parts = _match.trim().split(":");
      return `[filtered:${parts[0]}]`;
    })
    .slice(0, 50000);
}