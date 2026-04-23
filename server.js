import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./server/config.js";
import {
  generateImage,
  generatePost,
  getActiveProvider,
  refinePost
} from "./server/ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "./public");

const app = express();
const isVercel = Boolean(process.env.VERCEL);

app.use(express.json({ limit: "2mb" }));

if (!isVercel) {
  app.use(express.static(publicDir));
}

function badRequest(message) {
  return {
    statusCode: 400,
    message
  };
}

app.post("/api/generate-post", async (req, res) => {
  try {
    const context = req.body?.context?.trim();
    if (!context) {
      throw badRequest("Merci de renseigner le contexte du post.");
    }

    const generation = await generatePost(context);
    res.json({
      post: generation.result,
      provider: generation.provider,
      fallbackUsed: generation.fallbackUsed
    });
  } catch (error) {
    res.status(error.statusCode ?? 500).json({
      error: error.message ?? "Impossible de generer le post."
    });
  }
});

app.post("/api/refine-post", async (req, res) => {
  try {
    const context = req.body?.context?.trim();
    const draft = req.body?.draft?.trim();
    const feedback = req.body?.feedback?.trim();

    if (!context) {
      throw badRequest("Le contexte initial est requis.");
    }

    if (!draft) {
      throw badRequest("Le brouillon du post est requis avant amelioration.");
    }

    if (!feedback) {
      throw badRequest("Merci d'indiquer au moins une correction ou un commentaire.");
    }

    const generation = await refinePost({ context, draft, feedback });
    res.json({
      post: generation.result,
      provider: generation.provider,
      fallbackUsed: generation.fallbackUsed
    });
  } catch (error) {
    res.status(error.statusCode ?? 500).json({
      error: error.message ?? "Impossible d'ameliorer le post."
    });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const context = req.body?.context?.trim();
    const post = req.body?.post?.trim();
    const imageContext = req.body?.imageContext?.trim();

    if (!context) {
      throw badRequest("Le contexte du post est requis pour generer l'image.");
    }

    if (!post) {
      throw badRequest("Genere d'abord un post avant de demander l'image.");
    }

    const generation = await generateImage({ context, post, imageContext });
    const image = generation.result;
    res.json({
      imageBase64: `data:${image.mimeType};base64,${image.data}`,
      provider: generation.provider,
      fallbackUsed: generation.fallbackUsed
    });
  } catch (error) {
    res.status(error.statusCode ?? 500).json({
      error: error.message ?? "Impossible de generer l'image."
    });
  }
});

if (!isVercel) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.listen(config.port, () => {
    console.log(
      `Application disponible sur http://localhost:${config.port} avec le provider ${getActiveProvider()}`
    );
  });
}

export default app;
