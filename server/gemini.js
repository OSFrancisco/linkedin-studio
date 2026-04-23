import { GoogleGenAI } from "@google/genai";

import {
  IMAGE_SYSTEM_PROMPT,
  LINKEDIN_REFINEMENT_PROMPT,
  LINKEDIN_SYSTEM_PROMPT
} from "./prompts.js";
import { config } from "./config.js";

function getClient() {
  if (!process.env.GOOGLE_API_KEY) {
    const error = new Error("La variable GOOGLE_API_KEY est absente.");
    error.statusCode = 500;
    throw error;
  }

  return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
}

function getResponseText(response) {
  if (typeof response?.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part?.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    const error = new Error("La reponse texte de Google est vide ou invalide.");
    error.statusCode = 502;
    throw error;
  }

  return text;
}

function getImagePart(response) {
  const candidates = response?.candidates ?? [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part.inlineData;
      }
    }
  }

  const error = new Error("Aucune image n'a ete renvoyee par Google.");
  error.statusCode = 502;
  throw error;
}

function mapGoogleError(error) {
  let message = error?.message ?? "Erreur inconnue avec Google Gemini.";
  let statusCode = error?.statusCode ?? error?.status ?? 500;

  if (typeof message === "string" && message.startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      const nestedError = parsed?.error;

      if (nestedError?.message) {
        message = nestedError.message;
      }

      if (nestedError?.code) {
        statusCode = nestedError.code;
      }
    } catch {
      // Keep the original message when Google returns a non-JSON string.
    }
  }

  if (message.includes("API key") || message.includes("GOOGLE_API_KEY")) {
    return {
      statusCode: 500,
      message: "La cle API Google est absente ou invalide."
    };
  }

  if (statusCode === 429) {
    return {
      statusCode,
      message: "Quota Google atteint ou trop de requetes. Reessaie dans un moment."
    };
  }

  if (statusCode === 503) {
    return {
      statusCode,
      message: "Le modele Google est temporairement indisponible ou surcharge. Reessaie dans quelques instants."
    };
  }

  if (statusCode === 400) {
    return {
      statusCode,
      message: "La requete envoyee a Google est invalide. Verifie le contenu saisi."
    };
  }

  return {
    statusCode,
    message
  };
}

export async function generateLinkedInPost(context) {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: config.googleTextModel,
      contents: `Contexte utilisateur:\n${context}`,
      config: {
        systemInstruction: LINKEDIN_SYSTEM_PROMPT
      }
    });

    return getResponseText(response);
  } catch (error) {
    throw mapGoogleError(error);
  }
}

export async function refineLinkedInPost({ context, draft, feedback }) {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: config.googleTextModel,
      contents: [
        "Contexte initial:",
        context,
        "\nPost actuel:",
        draft,
        "\nCorrections utilisateur:",
        feedback
      ].join("\n"),
      config: {
        systemInstruction: LINKEDIN_REFINEMENT_PROMPT
      }
    });

    return getResponseText(response);
  } catch (error) {
    throw mapGoogleError(error);
  }
}

export async function generateLinkedInImage({ context, post, imageContext }) {
  try {
    const ai = getClient();
    const contents = [
      IMAGE_SYSTEM_PROMPT,
      "\nContexte du post:",
      context,
      "\nPost LinkedIn final:",
      post
    ];

    if (imageContext) {
      contents.push(
        "\nContexte supplementaire pour l'image:",
        imageContext
      );
    }

    contents.push(
      "\nGenere une seule image carrée 1080x1080, sans texte incruste, avec une direction artistique forte."
    );

    const response = await ai.models.generateContent({
      model: config.googleImageModel,
      contents: contents.join("\n"),
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const image = getImagePart(response);

    return {
      mimeType: image.mimeType ?? "image/png",
      data: image.data
    };
  } catch (error) {
    throw mapGoogleError(error);
  }
}
