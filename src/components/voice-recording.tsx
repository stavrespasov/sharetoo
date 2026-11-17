"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { l, type Lang } from "./common";

const sampleRate = 16_000;
const maxSeconds = 20;
type Phase = "permission" | "recording" | "loading" | "transcribing";
type Operation = { stream?: MediaStream; recorder?: MediaRecorder; timer?: number; unlisten?: () => void };

function releaseCapture(operation: Operation) {
  window.clearTimeout(operation.timer);
  operation.timer = undefined;
  if (operation.recorder?.state === "recording") operation.recorder.stop();
  operation.stream?.getTracks().forEach((track) => track.stop());
  operation.stream = undefined;
}

async function readAudio(blob: Blob) {
  if (!blob.size || blob.size > 8_000_000) throw new Error("invalid-audio");
  const audio = await new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(await blob.arrayBuffer());
  if (audio.duration > maxSeconds + 1) throw new Error("long-audio");
  const samples = new Float32Array(audio.length);
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    const data = audio.getChannelData(channel);
    for (let i = 0; i < data.length; i++) samples[i] += data[i] / audio.numberOfChannels;
  }
  const energy = samples.reduce((sum, sample) => sum + sample * sample, 0);
  if (audio.duration < 0.35 || energy / samples.length < 0.000004) throw new Error("silent-audio");
  return samples;
}

export function VoiceRecording({ lang, language, canRecord, onText }: {
  lang: Lang;
  language: "sl" | "en";
  canRecord: boolean;
  onText: (text: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>();
  const [message, setMessage] = useState("");
  const active = useRef<Operation | null>(null);
  const worker = useRef<Worker | null>(null);
  const t = (en: string, sl: string) => l(lang, en, sl);

  useEffect(() => () => {
    const operation = active.current;
    active.current = null;
    if (operation) releaseCapture(operation);
    operation?.unlisten?.();
    worker.current?.terminate();
    worker.current = null;
  }, []);

  function finish(operation: Operation, nextMessage: string) {
    if (active.current !== operation) return;
    active.current = null;
    releaseCapture(operation);
    operation.unlisten?.();
    setPhase(undefined);
    setMessage(nextMessage);
  }

  function cancel() {
    if (!active.current) return;
    finish(active.current, t("Recording or transcription cancelled.", "Snemanje ali prepis je preklican."));
    worker.current?.terminate();
    worker.current = null;
  }

  async function processAudio(audio: Blob, operation: Operation) {
    if (active.current !== operation) return;
    releaseCapture(operation);
    setPhase("loading");
    const unavailable = t("Transcription failed. Check your connection and try again, or type the description.", "Prepis ni uspel. Preverite povezavo in poskusite znova ali vnesite opis.");
    try {
      const samples = await readAudio(audio);
      if (active.current !== operation) return;
      const processor = worker.current ?? new Worker("/vehicle-dictation.js", { type: "module" });
      worker.current = processor;
      const fail = () => {
        if (active.current !== operation) return;
        processor.terminate();
        worker.current = null;
        finish(operation, unavailable);
      };
      const receive = ({ data }: MessageEvent<{ phase?: "transcribing"; text?: string; failed?: boolean; reason?: string }>) => {
        if (active.current !== operation) return;
        if (data.failed) {
          console.warn("On-device transcription failed.", data.reason);
          fail();
          return;
        }
        if (data.phase === "transcribing") { setPhase("transcribing"); return; }
        if (!data.text) {
          finish(operation, t("No speech found. Speak clearly and try again.", "Govor ni bil zaznan. Govorite jasno in poskusite znova."));
          return;
        }
        onText(data.text);
        finish(operation, t("Transcript added.", "Prepis je dodan."));
      };
      processor.addEventListener("error", fail);
      processor.addEventListener("messageerror", fail);
      processor.addEventListener("message", receive);
      operation.unlisten = () => {
        processor.removeEventListener("error", fail);
        processor.removeEventListener("messageerror", fail);
        processor.removeEventListener("message", receive);
      };
      operation.timer = window.setTimeout(fail, 180_000);
      processor.postMessage({ samples, language }, [samples.buffer]);
    } catch (error) {
      const reason = (error as Error).message;
      finish(operation, reason === "long-audio"
        ? t("Choose a recording of up to 20 seconds.", "Izberite posnetek, dolg največ 20 sekund.")
        : reason === "silent-audio"
          ? t("The recording was too quiet or short. Try again.", "Posnetek je bil pretih ali prekratek. Poskusite znova.")
          : t("The recording could not be read. Try a short audio file or type the description.", "Posnetka ni bilo mogoče prebrati. Poskusite s kratko zvočno datoteko ali vnesite opis."));
    }
  }

  async function start() {
    if (active.current) return;
    const operation: Operation = {};
    active.current = operation;
    setPhase("permission");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      operation.stream = stream;
      if (active.current !== operation) { releaseCapture(operation); return; }
      const recorder = new MediaRecorder(stream);
      operation.recorder = recorder;
      const parts: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
      recorder.onstop = () => { void processAudio(new Blob(parts, { type: recorder.mimeType }), operation); };
      recorder.onerror = () => finish(operation, t("Recording failed. Try again or choose an audio file.", "Snemanje ni uspelo. Poskusite znova ali izberite zvočno datoteko."));
      recorder.start();
      setPhase("recording");
      operation.timer = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, maxSeconds * 1000);
    } catch (error) {
      const denied = (error as Error).name === "NotAllowedError";
      finish(operation, denied
        ? t("Allow microphone access for this site, or choose an audio file.", "Dovolite dostop do mikrofona za to spletno mesto ali izberite zvočno datoteko.")
        : t("Recording could not start. Check your microphone or choose an audio file.", "Snemanja ni bilo mogoče začeti. Preverite mikrofon ali izberite zvočno datoteko."));
    }
  }

  const status = {
    permission: t("Waiting for microphone permission…", "Čakam na dovoljenje za mikrofon…"),
    recording: t("Recording · up to 20 seconds", "Snemam · največ 20 sekund"),
    loading: t("Preparing transcription on this device…", "Pripravljam prepis v tej napravi…"),
    transcribing: t("Turning speech into text…", "Pretvarjam govor v besedilo…"),
  };
  return <div className="voice">
    <div className="inline-actions">
      {phase === "recording" && <button className="btn primary" type="button" onClick={() => active.current?.recorder?.stop()}><Square size={16} />{t("Stop and fill fields", "Ustavi in izpolni polja")}</button>}
      {phase ? <button className="btn quiet" type="button" onClick={cancel}>{t("Cancel", "Prekliči")}</button> : <>
        {canRecord && <button className="btn secondary" type="button" onClick={start}><Mic size={17} />{t("Record description", "Posnemi opis")}</button>}
        <label className="btn quiet file-btn">{t("Choose audio file", "Izberi zvočno datoteko")}
          <input type="file" accept="audio/*" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file || active.current) return;
            const operation: Operation = {};
            active.current = operation;
            setMessage("");
            void processAudio(file, operation);
          }} />
        </label>
      </>}
    </div>
    <small role="status">{phase ? status[phase] : message || t("First use downloads a speech model (about 65–105 MB). Audio stays on this device.", "Ob prvi uporabi se prenese govorni model (približno 65–105 MB). Zvok ostane v tej napravi.")}</small>
  </div>;
}
