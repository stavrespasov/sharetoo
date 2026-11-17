import type { NextRequest } from "next/server";
import { hosted } from "@/lib/demo/config";
import { getMedia, readHosted } from "@/lib/demo/database";
import { isListed } from "@/lib/demo/actions";
import { hasOwnerSession } from "@/lib/demo/session";

export async function GET(request:NextRequest) {
  const id=request.nextUrl.searchParams.get("id");
  if(!hosted() || !id || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))return new Response(null,{status:404});
  const [state,owner]=await Promise.all([readHosted(),hasOwnerSession()]);
  if(!state.vehicles.some((v)=>v.photo==="/api/media?id="+id&&(owner||isListed(v))))return new Response(null,{status:404});
  const item=await getMedia(id);
  if(!item)return new Response(null,{status:404});
  return new Response(new Uint8Array(item.data),{headers:{"Content-Type":item.content_type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
