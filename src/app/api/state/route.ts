import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DomainError } from "@/lib/booking/domain";
import type { Store } from "@/lib/booking/types";
import { publicStore, type Receipt } from "@/lib/demo/actions";
import { hosted } from "@/lib/demo/config";
import { limit, readHosted, writeHosted } from "@/lib/demo/database";
import { authorizedPassword, hasOwnerSession, makeSession, sessionCookie, sessionLifetime } from "@/lib/demo/session";

const headers={"Cache-Control":"no-store"};
function view(state:Store,owner:boolean,receipt?:Receipt){return NextResponse.json({state:owner?state:publicStore(state),owner,receipt},{headers});}
function failed(error:unknown){
  if(error instanceof DomainError)return NextResponse.json({error:error.message},{status:error.status,headers});
  console.error("Sharetoo demo store operation failed",(error as {code?:string}).code ?? "");
  return NextResponse.json({error:"The shared demo is temporarily unavailable."},{status:503,headers});
}
export async function GET(request:NextRequest){
  if(!hosted())return NextResponse.json({error:"Browser demo mode is active."},{status:404,headers});
  try{
    const [state,owner]=await Promise.all([readHosted(),hasOwnerSession()]);
    const ref=request.nextUrl.searchParams.get("ref");
    const item=ref&&/^ST-[A-F0-9]{12}$/.test(ref)?state.bookings.find((b)=>b.ref===ref):undefined;
    return view(state,owner,item?{ref:item.ref,status:item.status}:undefined);
  }catch(error){return failed(error);}
}
export async function POST(request:NextRequest){
  if(!hosted())return NextResponse.json({error:"Browser demo mode is active."},{status:404,headers});
  try{
    const origin=request.headers.get("origin");
    if(origin&&new URL(origin).host!==request.headers.get("host"))throw new DomainError("origin","Invalid request origin.",403);
    if(!request.headers.get("content-type")?.includes("application/json"))throw new DomainError("format","Use JSON.",415);
    const body=await request.text();
    if(body.length>4_400_000)throw new DomainError("size","Request too large.",413);
    let action;
    try{action=JSON.parse(body);}catch{throw new DomainError("json","Invalid JSON.");}
    if(!action || typeof action!=="object")throw new DomainError("input","Invalid action.");
    const ip=request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ?? "local";
    const fingerprint=createHmac("sha256",process.env.DEMO_SESSION_SECRET!).update(ip).digest("hex");
    const secure=request.nextUrl.protocol==="https:"||process.env.VERCEL==="1";
    if(action.type==="login"){
      await limit("login:"+fingerprint,12,300);
      if(!authorizedPassword(action.password))throw new DomainError("login","Incorrect demo password.",401);
      const response=view(await readHosted(),true);
      response.cookies.set(sessionCookie,makeSession(),{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:sessionLifetime});
      return response;
    }
    const owner=await hasOwnerSession();
    if(action.type==="logout"){
      const response=view(await readHosted(),false);
      response.cookies.delete(sessionCookie);
      return response;
    }
    if(action.type==="request")await limit("request:"+fingerprint,25,300);
    else if(!owner)throw new DomainError("auth","Owner sign-in is required.",401);
    const next=await writeHosted(action);
    return view(next.state,owner,next.receipt);
  }catch(error){return failed(error);}
}
