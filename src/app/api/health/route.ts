import { hosted } from "@/lib/demo/config";

export function GET() {
  return Response.json({ ok: true, mode: hosted() ? "shared-demo" : "browser-demo" });
}
