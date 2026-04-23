const form = document.querySelector("#post-form");
const contextField = document.querySelector("#context");
const resultField = document.querySelector("#post-result");
const feedbackField = document.querySelector("#feedback");
const imageContextField = document.querySelector("#image-context");
const generatePostButton = document.querySelector("#generate-post-btn");
const refinePostButton = document.querySelector("#refine-post-btn");
const generateImageButton = document.querySelector("#generate-image-btn");
const statusBox = document.querySelector("#status-box");
const loadingIndicator = document.querySelector("#loading-indicator");
const imageElement = document.querySelector("#generated-image");
const imagePlaceholder = document.querySelector("#image-placeholder");

function setStatus(message, type = "default") {
  statusBox.textContent = message;
  statusBox.classList.remove("is-success", "is-error");

  if (type === "success") {
    statusBox.classList.add("is-success");
  }

  if (type === "error") {
    statusBox.classList.add("is-error");
  }
}

function setLoadingState(button, isLoading, loadingText, idleText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function setGlobalLoading(isLoading) {
  loadingIndicator.hidden = !isLoading;
}

function clearImage() {
  imageElement.removeAttribute("src");
  imageElement.style.display = "none";
  imagePlaceholder.style.display = "grid";
}

function formatProviderMessage(provider, fallbackUsed) {
  if (!provider) {
    return "";
  }

  const label = provider === "openai" ? "OpenAI" : "Google";
  return fallbackUsed
    ? ` Provider utilise : ${label} via fallback automatique.`
    : ` Provider utilise : ${label}.`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Une erreur est survenue.");
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const context = contextField.value.trim();
  if (!context) {
    setStatus("Merci de renseigner le contexte du post.", "error");
    contextField.focus();
    return;
  }

  try {
    clearImage();
    setLoadingState(generatePostButton, true, "Génération...", "Générer le post");
    setGlobalLoading(true);
    setStatus("Génération du post LinkedIn en cours...");

    const data = await postJson("/api/generate-post", { context });
    resultField.value = data.post ?? "";
    setStatus(
      `Le post a bien été généré.${formatProviderMessage(data.provider, data.fallbackUsed)} Tu peux maintenant l’ajuster ou générer l’image.`,
      "success"
    );
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoadingState(generatePostButton, false, "Génération...", "Générer le post");
    setGlobalLoading(false);
  }
});

refinePostButton.addEventListener("click", async () => {
  const context = contextField.value.trim();
  const draft = resultField.value.trim();
  const feedback = feedbackField.value.trim();

  if (!context) {
    setStatus("Ajoute d’abord le contexte du post.", "error");
    contextField.focus();
    return;
  }

  if (!draft) {
    setStatus("Génère ou colle d’abord un post à améliorer.", "error");
    resultField.focus();
    return;
  }

  if (!feedback) {
    setStatus("Ajoute au moins un commentaire pour guider l’amélioration.", "error");
    feedbackField.focus();
    return;
  }

  try {
    setLoadingState(refinePostButton, true, "Amélioration...", "Améliorer le post");
    setGlobalLoading(true);
    setStatus("Amélioration du post en cours...");

    const data = await postJson("/api/refine-post", {
      context,
      draft,
      feedback
    });

    resultField.value = data.post ?? "";
    setStatus(
      `Le post a été mis à jour selon tes commentaires.${formatProviderMessage(data.provider, data.fallbackUsed)}`,
      "success"
    );
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoadingState(refinePostButton, false, "Amélioration...", "Améliorer le post");
    setGlobalLoading(false);
  }
});

generateImageButton.addEventListener("click", async () => {
  const context = contextField.value.trim();
  const post = resultField.value.trim();
  const imageContext = imageContextField.value.trim();

  if (!context) {
    setStatus("Ajoute d’abord le contexte du post.", "error");
    contextField.focus();
    return;
  }

  if (!post) {
    setStatus("Génère d’abord le post avant de lancer l’image.", "error");
    resultField.focus();
    return;
  }

  try {
    setLoadingState(generateImageButton, true, "Création...", "Générer l’image");
    setGlobalLoading(true);
    setStatus("Génération de l’image carrée en cours...");

    const data = await postJson("/api/generate-image", {
      context,
      post,
      imageContext
    });
    if (!data.imageBase64) {
      throw new Error("Aucune image exploitable n’a été renvoyée.");
    }

    imageElement.src = data.imageBase64;
    imageElement.style.display = "block";
    imagePlaceholder.style.display = "none";
    setStatus(
      `L’image a été générée.${formatProviderMessage(data.provider, data.fallbackUsed)} Tu peux maintenant l’enregistrer depuis le navigateur.`,
      "success"
    );
  } catch (error) {
    clearImage();
    setStatus(error.message, "error");
  } finally {
    setLoadingState(generateImageButton, false, "Création...", "Générer l’image");
    setGlobalLoading(false);
  }
});

clearImage();
setGlobalLoading(false);
