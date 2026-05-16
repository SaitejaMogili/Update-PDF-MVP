import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Lazy init — build succeeds without env vars present at compile time
let _anthropic: Anthropic | null = null;

export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop: string | symbol) {
    if (!_anthropic) {
      _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    }
    return _anthropic[prop as keyof Anthropic];
  },
});
