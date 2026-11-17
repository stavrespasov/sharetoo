import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookie = "sharetoo-demo-owner";
export const sessionLifetime = 8*60*60;
const mac = (value:string) => createHmac("sha256",process.env.DEMO_SESSION_SECRET ?? "").update(value).digest("hex");
const equal = (a:string,b:string) => a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const authorizedPassword = (input:unknown) => typeof input==="string" && input.length<=256 && equal(mac(input),mac(process.env.DEMO_ADMIN_PASSWORD ?? ""));
export function makeSession() {
  const expires=String(Math.floor(Date.now()/1000)+sessionLifetime);
  return expires+"."+mac("owner:"+expires);
}
export async function hasOwnerSession() {
  if (!process.env.DEMO_SESSION_SECRET) return false;
  const cookie=(await cookies()).get(sessionCookie)?.value ?? "";
  const [expires,signature]=cookie.split(".");
  return /^\d+$/.test(expires) && typeof signature==="string" && /^[a-f0-9]{64}$/.test(signature) && +expires>Date.now()/1000 && equal(signature,mac("owner:"+expires));
}
