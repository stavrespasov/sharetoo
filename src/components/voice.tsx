"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { l, type Lang } from "./common";
import { VoiceRecording } from "./voice-recording";

type Speech = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function speechConstructor() {
  const browser = window as Window & { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function VoiceButton({ lang, onText }: { lang: Lang; onText: (text: string) => void }) {
  const [capabilities, setCapabilities] = useState({ native: false, local: false, record: false });
  const [useLocal, setUseLocal] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [voiceLang, setVoiceLang] = useState<Lang>();
  const recognition = useRef<Speech | null>(null);
  const language = voiceLang ?? lang;
  const local = capabilities.local && (useLocal || !capabilities.native);
  const t = (en: string, sl: string) => l(lang, en, sl);

  useEffect(() => {
    const timer = window.setTimeout(() => setCapabilities({
      native: Boolean(speechConstructor()),
      local: typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof OfflineAudioContext !== "undefined",
      record: typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    }), 0);
    return () => {
      window.clearTimeout(timer);
      const active = recognition.current;
      recognition.current = null;
      active?.abort();
    };
  }, []);

  function start() {
    const Recognition = speechConstructor();
    if (!Recognition) return;

    function unavailable(error?: string) {
      const text = error === "language-not-supported"
        ? t("This browser’s dictation does not support this language.", "Diktiranje brskalnika ne podpira tega jezika.")
        : error === "not-allowed"
          ? t("The browser denied dictation access.", "Brskalnik je zavrnil dostop za diktiranje.")
          : t("Browser dictation could not start.", "Diktiranje brskalnika se ni zagnalo.");
      setMessage(text);
      setUseLocal(true);
    }

    try {
      const instance = new Recognition();
      instance.lang = language === "sl" ? "sl-SI" : "en-GB";
      instance.interimResults = false;
      instance.continuous = false;
      instance.onresult = ({ results }) => {
        const spoken = results[0]?.[0]?.transcript.trim();
        if (recognition.current !== instance || !spoken) return;
        onText(spoken);
        setMessage(t("Transcript added.", "Prepis je dodan."));
      };
      instance.onerror = ({ error }) => {
        if (recognition.current !== instance) return;
        recognition.current = null;
        setListening(false);
        if (error === "aborted") setMessage(t("Dictation cancelled.", "Diktiranje je preklicano."));
        else if (error === "no-speech") setMessage(t("No speech was captured. Try again or record a description.", "Govor ni bil zaznan. Poskusite znova ali posnemite opis."));
        else unavailable(error);
      };
      instance.onend = () => {
        if (recognition.current !== instance) return;
        setListening(false);
        recognition.current = null;
        setMessage((current) => current || t("No speech was captured. Try again or type.", "Govor ni bil zaznan. Poskusite znova ali vtipkajte opis."));
      };
      recognition.current = instance;
      setMessage("");
      setListening(true);
      instance.start();
    } catch {
      recognition.current = null;
      setListening(false);
      unavailable();
    }
  }

  const canDictate = capabilities.native || capabilities.local;
  return <div className="voice">
    {canDictate && <div className="inline-actions">
      <select aria-label={t("Voice language", "Jezik diktiranja")} value={language} disabled={listening} onChange={(event) => setVoiceLang(event.target.value as Lang)}>
        <option value="sl">Slovenščina</option>
        <option value="en">English</option>
      </select>
      {!local && (listening ? <>
        <button className="btn secondary" type="button" onClick={() => recognition.current?.stop()}><Square size={16} />{t("Stop", "Ustavi")}</button>
        <button type="button" className="btn quiet" onClick={() => recognition.current?.abort()}>{t("Cancel", "Prekliči")}</button>
      </> : <button className="btn secondary" type="button" onClick={start}><Mic size={17} />{t("Dictate", "Diktiraj")}</button>)}
      {capabilities.native && capabilities.local && !listening && <button type="button" className="btn quiet" onClick={() => { setMessage(""); setUseLocal(!local); }}>
        {local ? t("Browser dictation", "Diktiranje brskalnika") : t("Record or choose audio", "Posnemi ali izberi zvok")}
      </button>}
    </div>}
    {(listening || message || !local) && <small role="status">{listening ? t("Listening…", "Poslušam…") : message || (capabilities.native
      ? t("Your browser may process dictation online.", "Brskalnik lahko diktiranje obdela prek spleta.")
      : t("Type a description and select Fill fields.", "Vnesite opis in izberite Izpolni polja."))}</small>}
    {local && <VoiceRecording lang={lang} language={language} canRecord={capabilities.record} onText={onText} />}
  </div>;
}
