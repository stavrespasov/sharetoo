const library = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
const models = {
  sl: { id: "onnx-community/whisper-base", revision: "27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c" },
  en: { id: "onnx-community/whisper-tiny", revision: "ff4177021cc41f7db950912b73ea4fdf7d01d8e7" },
};
let transcribe;
let currentLanguage;

async function loadModel(language) {
  const { env, pipeline } = await import(library);
  env.allowLocalModels = false;
  env.useBrowserCache = typeof self.caches !== "undefined";
  env.backends.onnx.wasm.numThreads = 1;
  const { id, revision } = models[language];
  return pipeline("automatic-speech-recognition", id, {
    revision,
    device: "wasm",
    dtype: "q8",
  });
}

self.onmessage = async ({ data: { samples, language } }) => {
  try {
    if (currentLanguage !== language) {
      await transcribe?.dispose();
      transcribe = undefined;
      currentLanguage = undefined;
    }
    transcribe ??= await loadModel(language);
    currentLanguage = language;
    self.postMessage({ phase: "transcribing" });
    const result = await transcribe(samples, { language, task: "transcribe", max_new_tokens: 96 });
    self.postMessage({ text: result.text.trim() });
  } catch (error) {
    const reason = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[asset URL]").slice(0, 240) : "";
    self.postMessage({ failed: true, reason });
  }
};
