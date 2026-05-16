import "server-only";
import OpenAI from "openai";

// Lazy init — build succeeds without env vars present at compile time
let _openai: OpenAI | null = null;

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    if (!_openai) {
      _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    }
    return _openai[prop as keyof OpenAI];
  },
});
