const $ = (selector) => document.querySelector(selector);

const originalText = $("#originalText");
const charCount = $("#charCount");
const simplifyButton = $("#simplifyButton");
const resultText = $("#resultText");
const emptyState = $("#emptyState");
const resultArea = $("#resultArea");
const resultActions = $("#resultActions");
const explanation = $("#explanation");
const termInput = $("#termInput");
const toast = $("#toast");

let currentResult = "";
let fontScale = 1;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.dataset.originalLabel ??= button.innerHTML;
  button.innerHTML = busy ? `<span class="spinner" aria-hidden="true">◌</span> ${label}` : button.dataset.originalLabel;
}

originalText.addEventListener("input", () => {
  charCount.textContent = `${originalText.value.length.toLocaleString("pt-BR")} / 2.000 caracteres`;
});

$("#clearButton").addEventListener("click", () => {
  originalText.value = "";
  charCount.textContent = "0 / 2.000 caracteres";
  originalText.focus();
});

async function postJSON(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Ocorreu um erro. Tente novamente.");
  return payload;
}

simplifyButton.addEventListener("click", async () => {
  const text = originalText.value.trim();
  if (text.length < 20) {
    showToast("Cole um texto com pelo menos 20 caracteres.");
    originalText.focus();
    return;
  }

  setBusy(simplifyButton, true, "Simplificando...");
  resultArea.setAttribute("aria-busy", "true");
  explanation.textContent = "";

  try {
    const data = await postJSON("/api/simplify", { text });
    currentResult = data.result;
    resultText.textContent = currentResult;
    resultText.hidden = false;
    emptyState.hidden = true;
    resultActions.hidden = false;
    showToast("Texto simplificado com sucesso!");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(simplifyButton, false);
    resultArea.setAttribute("aria-busy", "false");
  }
});

$("#copyButton").addEventListener("click", async () => {
  if (!currentResult) return;
  try {
    await navigator.clipboard.writeText(currentResult);
    showToast("Texto copiado!");
  } catch {
    showToast("Não foi possível copiar automaticamente neste navegador.");
  }
});

async function explainTerm() {
  const term = termInput.value.trim();
  if (!term) {
    showToast("Digite uma palavra ou expressão primeiro.");
    termInput.focus();
    return;
  }
  const button = $("#explainButton");
  setBusy(button, true, "Consultando...");
  explanation.textContent = "";
  try {
    const data = await postJSON("/api/explain", {
      term,
      context: currentResult || originalText.value.trim()
    });
    explanation.textContent = data.result;
  } catch (error) {
    explanation.textContent = error.message;
  } finally {
    setBusy(button, false);
  }
}
$("#explainButton").addEventListener("click", explainTerm);
termInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") explainTerm();
});

function speak(text) {
  if (!("speechSynthesis" in window)) {
    showToast("A leitura em voz alta não é compatível com este navegador.");
    return;
  }
  if (!text) {
    showToast("Não há texto para ler.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}
$("#readResultButton").addEventListener("click", () => speak(currentResult));
$("#stopSpeech").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  showToast("Leitura interrompida.");
});

const accessPanel = $("#accessPanel");
$("#accessToggle").addEventListener("click", () => {
  const isOpen = !accessPanel.hidden;
  accessPanel.hidden = isOpen;
  $("#accessToggle").setAttribute("aria-expanded", String(!isOpen));
});
$("#closeAccess").addEventListener("click", () => {
  accessPanel.hidden = true;
  $("#accessToggle").setAttribute("aria-expanded", "false");
});

function updateFont() {
  document.documentElement.style.setProperty("--font-scale", fontScale);
}
$("#increaseFont").addEventListener("click", () => {
  fontScale = Math.min(1.35, +(fontScale + 0.1).toFixed(2));
  updateFont();
});
$("#decreaseFont").addEventListener("click", () => {
  fontScale = Math.max(0.85, +(fontScale - 0.1).toFixed(2));
  updateFont();
});

$("#contrastToggle").addEventListener("click", (event) => {
  const enabled = document.body.classList.toggle("high-contrast");
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
});
$("#readingToggle").addEventListener("click", (event) => {
  const enabled = document.body.classList.toggle("reading-mode");
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
});

// Informa visualmente quando a API ainda não foi configurada.
fetch("/api/status")
  .then((response) => response.json())
  .then((status) => {
    if (!status.aiConfigured) {
      showToast("Configure a chave da API seguindo o arquivo LEIA-ME.");
    }
  })
  .catch(() => {});
