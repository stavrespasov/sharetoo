"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { demoKey, mutate, type Command, type Receipt } from "@/lib/demo/actions";
import { seedStore, updateDefaultPickup } from "@/lib/demo/seed";
import type { Store } from "@/lib/booking/types";
import PublicExperience from "./public";
import AdminExperience from "./admin";
import { l, Notice, type Lang } from "./common";

type Workspace = { state: Store; owner: boolean; receipt?: Receipt };
function localState() {
  const saved = localStorage.getItem(demoKey);
  if (saved) try { return updateDefaultPickup(JSON.parse(saved) as Store); } catch { /* use a fresh demo */ }
  const state = seedStore();
  localStorage.setItem(demoKey, JSON.stringify(state));
  return state;
}
async function api(path: string, request?: unknown) {
  const response = await fetch(path,{
    method:request ? "POST" : "GET", cache:"no-store",
    ...(request ? { headers:{"Content-Type":"application/json"},body:JSON.stringify(request) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "The workspace could not load.");
  return payload as Workspace;
}
export default function Experience({ brand, hosted }: { brand: string; hosted: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const path = pathname.split("/").filter(Boolean);
  const [workspace,setWorkspace] = useState<Workspace>();
  const [error,setError] = useState("");
  const [lang,setLang] = useState<Lang>("sl");
  const [lastReceipt,setReceipt] = useState<Receipt>();
  const ref = params.get("ref") ?? "";
  const isAdmin = path[0] === "admin";
  const loginPath = pathname === "/admin/login";
  const refresh = useCallback(async () => {
    if (hosted) return api("/api/state" + (ref ? "?ref=" + encodeURIComponent(ref) : ""));
    return {state:localState(),owner:sessionStorage.getItem("sharetoo-owner") === "1"};
  }, [hosted,ref]);
  useEffect(() => {
    let alive = true;
    const load = () => refresh().then((value) => {
      if (alive) {setWorkspace(value); setError(""); setLang(localStorage.getItem("sharetoo-lang") === "en" ? "en" : "sl");}
    }).catch((e: Error) => { if (alive) setError(e.message); });
    void load();
    const active = () => { if (!document.hidden) void load(); };
    window.addEventListener("storage", active);
    window.addEventListener("focus", active);
    document.addEventListener("visibilitychange", active);
    return () => {alive = false;window.removeEventListener("storage",active);window.removeEventListener("focus",active);document.removeEventListener("visibilitychange",active);};
  }, [refresh,pathname]);
  useEffect(() => {document.documentElement.lang = lang;},[lang]);

  async function perform(action: Command) {
    if (hosted) {
      const result = await api("/api/state",action);
      setWorkspace(result);
      if (result.receipt) setReceipt(result.receipt);
      return result.receipt;
    }
    if (action.type !== "request" && sessionStorage.getItem("sharetoo-owner") !== "1") throw new Error("Open the owner demo first.");
    const apply = () => {
      const result = mutate(localState(), action);
      localStorage.setItem(demoKey,JSON.stringify(result.state));
      setWorkspace({state:result.state,owner:sessionStorage.getItem("sharetoo-owner")==="1"});
      return result.receipt;
    };
    return navigator.locks ? navigator.locks.request(demoKey,apply) : apply();
  }
  async function signIn(password: string) {
    if (hosted) setWorkspace(await api("/api/state",{type:"login",password}));
    else {
      sessionStorage.setItem("sharetoo-owner","1");
      setWorkspace({state:localState(),owner:true});
    }
    router.replace("/admin");
  }
  async function signOut() {
    if (hosted) setWorkspace(await api("/api/state",{type:"logout"}));
    else {sessionStorage.removeItem("sharetoo-owner");setWorkspace({state:localState(),owner:false});}
    router.push("/");
  }
  function language(value: Lang) {localStorage.setItem("sharetoo-lang",value);setLang(value);}
  if (!workspace) return <main className="shell section"><h2>{brand}</h2>{error ? <Notice error>{error} <button onClick={() => location.reload()}>{l(lang,"Retry","Poskusi znova")}</button></Notice> : <p role="status">{l(lang,"Loading…","Nalaganje…")}</p>}</main>;
  if (isAdmin) return <AdminExperience key={pathname} state={workspace.state} brand={brand} lang={lang} path={path} perform={perform} language={language} hosted={hosted} owner={workspace.owner && !loginPath} signIn={signIn} signOut={signOut} />;
  return <PublicExperience state={workspace.state} brand={brand} lang={lang} language={language} path={path} perform={perform} receipt={workspace.receipt ?? lastReceipt} />;
}
