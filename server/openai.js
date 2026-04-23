import {
  IMAGE_SYSTEM_PROMPT,
  LINKEDIN_REFINEMENT_PROMPT,
  LINKEDIN_SYSTEM_PROMPT
} from "./prompts.js";
import { config } from "./config.js";

const OPENAI_API_URL = "https://api.openai.com/v1";

function ensureOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("La variable OPENAI_API_KEY est absente.");
    error.statusCode = 500;
    throw error;
  }
}

async function openaiRequest(path, payload) {
  ensureOpenAIKey();

  const response = await fetch(`${OPENAI_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ?? "Erreur inconnue avec l'API OpenAI."
    );
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

function mapOpenAIError(error) {
  const message = error?.message ?? "Erreur inconnue avec OpenAI.";
  const statusCode = error?.statusCode ?? error?.status ?? 500;

  if (message.includes("OPENAI_API_KEY") || statusCode === 401) {
    return {
      statusCode: 500,
      message: "La cle API OpenAI est absente ou invalide."
    };
  }

  if (statusCode === 429) {
    return {
      statusCode,
      message: "Quota OpenAI atteint ou trop de requetes. Reessaie dans un moment."
    };
  }

  if (statusCode === 400) {
    return {
      statusCode,
      message: "La requete envoyee a OpenAI est invalide. Verifie les parametres et la cle API."
    };
  }

  if (statusCode >= 500) {
    return {
      statusCode,
      message: "OpenAI est temporairement indisponible. Reessaie dans quelques instants."
    };
  }

  return {
    statusCode,
    message
  };
}

function getOutputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputs = response?.output ?? [];
  const text = outputs
    .flatMap((item) => item?.content ?? [])
    .filter((item) => item?.type === "output_text")
    .map((item) => item?.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    const error = new Error("La reponse texte de OpenAI est vide ou invalide.");
    error.statusCode = 502;
    throw error;
  }

  return text;
}

export async function generateLinkedInPostWithOpenAI(context) {
  try {
    const response = await openaiRequest("/responses", {
      model: config.openaiTextModel,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: LINKEDIN_SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: `Contexte utilisateur:\n${context}` }
          ]
        }
      ]
    });

    return getOutputText(response);
  } catch (error) {
    throw mapOpenAIError(error);
  }
}

export async function refineLinkedInPostWithOpenAI({ context, draft, feedback }) {
  try {
    const response = await openaiRequest("/responses", {
      model: config.openaiTextModel,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: LINKEDIN_REFINEMENT_PROMPT }]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Contexte initial:",
                context,
                "",
                "Post actuel:",
                draft,
                "",
                "Corrections utilisateur:",
                feedback
              ].join("\n")
            }
          ]
        }
      ]
    });

    return getOutputText(response);
  } catch (error) {
    throw mapOpenAIError(error);
  }
}

export async function generateLinkedInImageWithOpenAI({
  context,
  post,
  imageContext
}) {
  try {
    const promptSections = [
      IMAGE_SYSTEM_PROMPT,
      "",
      "Contexte du post:",
      context,
      "",
      "Post LinkedIn final:",
      post
    ];

    if (imageContext) {
      promptSections.push(
        "",
        "Contexte supplementaire pour l'image:",
        imageContext
      );
    }

    promptSections.push(
      "",
      "Genere une image carree 1080x1080 premium, sans texte incruste, exploitable pour un post LinkedIn."
    );

    const prompt = promptSections.join("\n");

    const response = await openaiRequest("/images/generations", {
      model: config.openaiImageModel,
      prompt,
      size: "1080x1080",
      quality: "high"
    });

    const imageBase64 = response?.data?.[0]?.b64_json;
    if (!imageBase64) {
      const error = new Error("Aucune image n'a ete renvoyee par OpenAI.");
      error.statusCode = 502;
      throw error;
    }

    return {
      mimeType: "image/png",
      data: imageBase64
    };
  } catch (error) {
    throw mapOpenAIError(error);
  }
}
