import type { NextRequest } from "next/server";
import { hosted } from "@/lib/demo/config";
import { hasOwnerSession } from "@/lib/demo/session";

type Metadata = Record<string,{value:string}>;
type CommonsPage = {title:string;imageinfo?: {thumburl?:string;descriptionurl:string;extmetadata:Metadata}[]};
const clean=(value:string) => value.replace(/<[^>]*>/g,"").replaceAll("&amp;","&").trim().slice(0,185);
export async function GET(request: NextRequest) {
  if(hosted() && !await hasOwnerSession())return Response.json({error:"Owner sign-in is required."},{status:401});
  const q=(request.nextUrl.searchParams.get("q")??"").replace(/[^\p{L}\p{N} -]/gu,"").trim().slice(0,100);
  if(q.length<3)return Response.json({items:[]});
  const url=new URL("https://commons.wikimedia.org/w/api.php");
  const params={ action:"query",generator:"search",gsrnamespace:"6",gsrsearch:q,gsrlimit:"10",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"720",format:"json" };
  url.search=new URLSearchParams(params).toString();
  try {
    const response=await fetch(url,{headers:{"User-Agent":"SharetooConcept/1.0 (vehicle illustration lookup)"},signal:AbortSignal.timeout(6500),next:{revalidate:3600}});
    if(!response.ok)throw Error("Photo service returned an error.");
    const result=await response.json() as {query?:{pages:Record<string,CommonsPage>}};
    const items=Object.values(result.query?.pages??{}).flatMap((page)=>{
      const info=page.imageinfo?.[0];
      const license=clean(info?.extmetadata?.LicenseShortName?.value??"");
      const author=clean(info?.extmetadata?.Artist?.value??"");
      if(!info?.thumburl?.startsWith("https://upload.wikimedia.org/")||!info.descriptionurl.startsWith("https://commons.wikimedia.org/")||!author||!(/^(CC BY(?:-SA)? [2-4]\.[05]|CC0|Public domain)/i.test(license)))return [];
      return [{src:info.thumburl,credit:{title:clean(page.title.replace(/^File:/,"")),license,author,url:info.descriptionurl}}];
    });
    return Response.json({items});
  }catch{
    return Response.json({error:"Photo suggestions are unavailable. Upload a photo or use the demo catalog."},{status:502});
  }
}
