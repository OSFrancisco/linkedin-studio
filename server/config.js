export const config = {
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  provider:
    process.env.AI_PROVIDER ??
    (process.env.OPENAI_API_KEY ? "openai" : "google"),
  googleTextModel:
    process.env.GOOGLE_TEXT_MODEL ??
    process.env.TEXT_MODEL ??
    "gemini-3-pro-preview",
  googleImageModel:
    process.env.GOOGLE_IMAGE_MODEL ??
    process.env.IMAGE_MODEL ??
    "gemini-3-pro-image-preview",
  openaiTextModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1"
};
