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
  const [voiceLang,setVoiceLang] = useState(lang === "sl" ? "sl-SI" : "en-GB");
  const recognition = useRef<Speech | null>(null);
  const speechWindow = () => window as unknown as { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
  useEffect(() => {
    const w = speechWindow();
    const timer = window.setTimeout(() => setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)), 0);
    return () => {window.clearTimeout(timer);recognition.current?.abort();};
  }, []);
  function start() {
    const w = speechWindow();
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) return;
    const instance = new Recognition();
    instance.lang = voiceLang;
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = ({results}) => { const spoken = results[0]?.[0]?.transcript; if (spoken) {onText(spoken);setMessage(l(lang,"Review the transcript before creating a draft.","Pred ustvarjanjem osnutka preglejte prepis."));} };
    instance.onerror = ({error}) => {setMessage(l(lang,"Microphone unavailable ("+error+"). Type or use your keyboard's dictation.","Mikrofon ni na voljo. Uporabite tipkovnico ali diktiranje."));setListening(false);};
    instance.onend = () => {setListening(false);recognition.current = null;setMessage((current) => current || l(lang,"Dictation ended. You can type here at any time.","Diktiranje je končano. Lahko nadaljujete s tipkanjem."));};
    recognition.current = instance;
    setMessage("");setListening(true);
    try {instance.start();} catch {setListening(false);setMessage(l(lang,"Dictation could not start. You can type here.","Diktiranje se ni zagnalo. Uporabite tipkovnico."));}
  }
  return <div className="voice"><div className="inline-actions">{supported && <>
    <select aria-label="Voice language" value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}><option value="en-GB">English</option><option value="sl-SI">Slovenščina</option></select>
    {listening ? <><button className="btn secondary" type="button" onClick={() => recognition.current?.stop()}><Square size={16} /> {l(lang,"Stop","Ustavi")}</button><button type="button" className="btn quiet" onClick={() => recognition.current?.abort()}>{l(lang,"Cancel","Prekliči")}</button></> : <button className="btn secondary" type="button" onClick={start}><Mic size={17} />{l(lang,"Dictate","Diktiraj")}</button>}
  </>}</div><small role="status">{listening ? l(lang,"Listening…","Poslušam…") : message || (supported ? l(lang,"Your browser may process voice online.","Brskalnik lahko glas obdela prek spleta.") : l(lang,"Type or use your phone keyboard’s dictation.","Uporabite tipkovnico ali diktiranje telefona."))}</small></div>;
}
