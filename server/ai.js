import {
  generateLinkedInImage,
  generateLinkedInPost,
  refineLinkedInPost
} from "./gemini.js";
import {
  generateLinkedInImageWithOpenAI,
  generateLinkedInPostWithOpenAI,
  refineLinkedInPostWithOpenAI
} from "./openai.js";
import { config } from "./config.js";

export function getActiveProvider() {
  return config.provider;
}

function canFallbackFrom(error) {
  const statusCode = error?.statusCode ?? error?.status ?? 500;
  return statusCode === 429 || statusCode >= 500;
}

function getProviderOrder() {
  if (config.provider === "openai") {
    return ["openai", "google"];
  }

  return ["google", "openai"];
}

async function runWithProvider(provider, action, payload) {
  if (provider === "openai") {
    if (action === "generatePost") {
      return generateLinkedInPostWithOpenAI(payload);
    }

    if (action === "refinePost") {
      return refineLinkedInPostWithOpenAI(payload);
    }

    return generateLinkedInImageWithOpenAI(payload);
  }

  if (action === "generatePost") {
    return generateLinkedInPost(payload);
  }

  if (action === "refinePost") {
    return refineLinkedInPost(payload);
  }

  return generateLinkedInImage(payload);
}

async function executeWithFallback(action, payload) {
  const providers = getProviderOrder();
  const errors = [];

  for (const provider of providers) {
    try {
      const result = await runWithProvider(provider, action, payload);
      return {
        provider,
        result,
        fallbackUsed: provider !== providers[0]
      };
    } catch (error) {
      errors.push({ provider, error });

      if (!canFallbackFrom(error) || provider === providers[providers.length - 1]) {
        throw {
          ...error,
          provider,
          fallbackAttempts: errors.map((item) => ({
            provider: item.provider,
            message: item.error?.message,
            statusCode: item.error?.statusCode ?? item.error?.status
          }))
        };
      }
    }
  }
}

export async function generatePost(context) {
  return executeWithFallback("generatePost", context);
}

export async function refinePost(payload) {
  return executeWithFallback("refinePost", payload);
}

export async function generateImage(payload) {
  return executeWithFallback("generateImage", payload);
}
