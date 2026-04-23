# LinkedIn AI Studio

Application locale en `HTML/CSS/JS` + `Node.js` pour :
- generer un post LinkedIn avec Gemini
- affiner ce post avec des commentaires utilisateur
- generer une image IA carree 1:1 reliee au post

## Prerequis

- Node.js `18+`
- une cle API Google Gemini

## Installation

1. Installer Node.js si ce n'est pas deja fait.
2. Copier `.env.example` en `.env`
3. Renseigner `GOOGLE_API_KEY` dans `.env`
4. Installer les dependances :

```bash
npm install
```

5. Lancer le projet :

```bash
npm run dev
```

6. Ouvrir `http://localhost:3000`

## Variables d'environnement

```env
PORT=3000
AI_PROVIDER=google
GOOGLE_API_KEY=ta_cle_google
OPENAI_API_KEY=ta_cle_openai
GOOGLE_TEXT_MODEL=gemini-3-pro-preview
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Endpoints

- `POST /api/generate-post` avec `{ "context": "..." }`
- `POST /api/refine-post` avec `{ "context": "...", "draft": "...", "feedback": "..." }`
- `POST /api/generate-image` avec `{ "context": "...", "post": "..." }`

## Notes Google

- La cle reste cote serveur et n'est jamais exposee dans le front.
- Le projet peut utiliser Google ou OpenAI via `AI_PROVIDER`.
- Si `AI_PROVIDER=openai`, le texte passe par `gpt-4.1-mini` et l'image par `gpt-image-1`.
- Si `AI_PROVIDER=google`, le texte passe par `gemini-3-pro-preview` et l'image par `gemini-3-pro-image-preview`.
- Si `AI_PROVIDER` n'est pas defini, le projet utilise OpenAI si `OPENAI_API_KEY` existe, sinon Google.
- Si le provider prioritaire renvoie un `429` ou une erreur serveur `5xx`, l'application tente automatiquement le second provider.

## Prompts

Les prompts de generation sont codes en dur dans :
- `server/prompts.js`

Tu pourras facilement ajuster :
- le ton editorial du post
- la structure du copywriting LinkedIn
- la direction artistique et les contraintes du visuel

## Limites actuelles

- Aucun historique multi-post n'est stocke.
- Il n'y a pas encore d'export automatique du texte ou de l'image.
- Le projet n'est pas encore prepare pour un deploiement Vercel/Netlify, mais la structure est volontairement simple pour y venir ensuite.
