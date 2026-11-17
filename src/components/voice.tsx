"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { l, type Lang } from "./common";

type Speech = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export function VoiceButton({ lang, onText }: { lang: Lang; onText: (text: string) => void }) {
  const [supported,setSupported] = useState<boolean | null>(null);
  const [listening,setListening] = useState(false);
  const [message,setMessage] = useState("");
  const [voiceLang,setVoiceLang] = useState<string>();
  const recognition = useRef<Speech | null>(null);
  const speechWindow = () => window as unknown as { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
  useEffect(() => {
    const w = speechWindow();
    const timer = window.setTimeout(() => setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)), 0);
    return () => {
      window.clearTimeout(timer);
      const active = recognition.current;
      recognition.current = null;
      active?.abort();
    };
  }, []);
  function start() {
    const w = speechWindow();
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) return;
    const instance = new Recognition();
    instance.lang = voiceLang ?? (lang === "sl" ? "sl-SI" : "en-GB");
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = ({results}) => {
      const spoken = results[0]?.[0]?.transcript.trim();
      if (recognition.current !== instance || !spoken) return;
      onText(spoken);
      setMessage(l(lang,"Transcript added.","Prepis je dodan."));
    };
    instance.onerror = ({error}) => {
      if (recognition.current !== instance) return;
      setMessage(error === "aborted" ? l(lang,"Dictation cancelled.","Diktiranje je preklicano.") : l(lang,"Microphone unavailable. Type or use your keyboard’s dictation.","Mikrofon ni na voljo. Uporabite tipkovnico ali njeno diktiranje."));
      setListening(false);
    };
    instance.onend = () => {
      if (recognition.current !== instance) return;
      setListening(false); recognition.current = null;
      setMessage((current) => current || l(lang,"No speech was captured. Try again or type.","Govor ni bil zaznan. Poskusite znova ali vtipkajte opis."));
    };
    recognition.current = instance;
    setMessage("");setListening(true);
    try {instance.start();} catch {recognition.current = null;setListening(false);setMessage(l(lang,"Dictation could not start. You can type here.","Diktiranje se ni zagnalo. Uporabite tipkovnico."));}
  }
  return <div className="voice"><div className="inline-actions">{supported && <>
    <select aria-label={l(lang,"Voice language","Jezik diktiranja")} value={voiceLang ?? (lang === "sl" ? "sl-SI" : "en-GB")} disabled={listening} onChange={(e) => setVoiceLang(e.target.value)}><option value="sl-SI">Slovenščina</option><option value="en-GB">English</option></select>
    {listening ? <><button className="btn secondary" type="button" onClick={() => recognition.current?.stop()}><Square size={16} /> {l(lang,"Stop","Ustavi")}</button><button type="button" className="btn quiet" onClick={() => recognition.current?.abort()}>{l(lang,"Cancel","Prekliči")}</button></> : <button className="btn secondary" type="button" onClick={start}><Mic size={17} />{l(lang,"Dictate","Diktiraj")}</button>}
  </>}</div><small role="status">{listening ? l(lang,"Listening…","Poslušam…") : message || (supported ? l(lang,"Your browser may process voice online.","Brskalnik lahko glas obdela prek spleta.") : l(lang,"Type or use your phone keyboard’s dictation.","Uporabite tipkovnico ali diktiranje telefona."))}</small></div>;
}
