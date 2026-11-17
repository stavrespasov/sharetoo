const library = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js";
let model;

async function loadModel() {
  const { env, pipeline } = await import(library);
  env.allowLocalModels = false;
  env.useBrowserCache = typeof self.caches !== "undefined";
  env.backends.onnx.wasm.numThreads = 1;
  return pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny", {
    revision: "ff4177021cc41f7db950912b73ea4fdf7d01d8e7",
    device: "wasm",
    dtype: "q8",
  });
}

self.onmessage = async ({ data: { samples, language } }) => {
  try {
    model ??= loadModel();
    const transcribe = await model;
    self.postMessage({ phase: "transcribing" });
    const result = await transcribe(samples, { language, task: "transcribe", max_new_tokens: 96 });
    self.postMessage({ text: result.text.trim() });
  } catch {
    model = undefined;
    self.postMessage({ failed: true });
  }
};
