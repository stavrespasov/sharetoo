import "server-only";

import postgres from "postgres";
import { allocated, DomainError } from "../booking/domain";
import type { Store, VehiclePhoto } from "../booking/types";
import { command, mutate } from "./actions";
import { seedStore, updateDemoDefaults } from "./seed";

let connection: ReturnType<typeof postgres> | undefined;
function db() {
  if (!process.env.DATABASE_URL) throw Error("The hosted database is unavailable.");
  return connection ??= postgres(process.env.DATABASE_URL,{ max:2, idle_timeout:20, connect_timeout:10, prepare:false });
}
async function initialize() {
  const sql = db();
  const found = await sql`SELECT name FROM sharetoo_demo WHERE name = 'default'`;
  if (found.length) return sql;
  const seed = seedStore();
  await sql.begin(async (tx) => {
    const inserted = await tx`INSERT INTO sharetoo_demo (name,state) VALUES ('default',${tx.json(seed as unknown as postgres.JSONValue)}) ON CONFLICT DO NOTHING RETURNING name`;
    if (inserted.length) await allocations(tx,seed);
  });
  return sql;
}
type Tx = postgres.TransactionSql<Record<string, never>>;
async function allocations(tx: Tx, state: Store) {
  await tx`DELETE FROM sharetoo_allocations`;
  for (const item of [...state.bookings.filter((b)=>allocated.has(b.status)),...state.blocks]) {
    const end = new Date(Date.parse(item.returnAt) + ("buffer" in item ? item.buffer * 60000 : 0)).toISOString();
    await tx`INSERT INTO sharetoo_allocations (id,vehicle_id,occupied)
      VALUES (${item.id},${item.vehicleId},tstzrange(${item.pickup}::timestamptz,${end}::timestamptz,'[)'))`;
  }
}
export async function readHosted() {
  const sql = await initialize();
  const [row] = await sql<{state:Store}[]>`SELECT state FROM sharetoo_demo WHERE name = 'default'`;
  return updateDemoDefaults(row.state);
}
export async function writeHosted(action: unknown) {
  const sql = await initialize();
  try {
    return await sql.begin(async (tx) => {
      const [row] = await tx<{state:Store}[]>`SELECT state FROM sharetoo_demo WHERE name = 'default' FOR UPDATE`;
      const parsed=command.safeParse(action);
      const result = mutate(updateDemoDefaults(row.state),action);
      if (parsed.success && parsed.data.type==="vehicle") {
        const v=result.state.vehicles.find((item)=>item.id===(parsed.data as {vehicle:{id:string}}).vehicle.id)!;
        const savedPhotos = new Set(row.state.vehicles.flatMap((item)=>[item.photo,...(item.gallery ?? []).map((entry)=>entry.photo)]));
        async function savePhoto(entry: VehiclePhoto) {
          const upload=entry.photo.match(/^data:(image\/(?:webp|png|jpeg));base64,([a-zA-Z0-9+/=]+)$/);
          if (upload) {
            const id=crypto.randomUUID();
            await tx`INSERT INTO sharetoo_demo_media (id,content_type,data) VALUES (${id},${upload[1]},${Buffer.from(upload[2],"base64")})`;
            return {...entry,photo:"/api/media?id="+id};
          }
          if (entry.photo.startsWith("/api/media?") && !savedPhotos.has(entry.photo)) throw new DomainError("photo","Choose a current image or upload a new one.");
          return entry;
        }
        const primary = await savePhoto({photo:v.photo,photoSource:v.photoSource,photoCredit:v.photoCredit});
        Object.assign(v,primary);
        v.gallery = await Promise.all((v.gallery ?? []).map(savePhoto));
      }
      if (parsed.success && ["status","block","remove","reset"].includes(parsed.data.type)) await allocations(tx,result.state);
      await tx`UPDATE sharetoo_demo SET state=${tx.json(result.state as unknown as postgres.JSONValue)} WHERE name='default'`;
      await tx`DELETE FROM sharetoo_demo_media WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(${tx.json(result.state.vehicles as unknown as postgres.JSONValue)}) AS v
        WHERE v->>'photo' = '/api/media?id=' || sharetoo_demo_media.id::text
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(v->'gallery','[]'::jsonb)) AS image
            WHERE image->>'photo' = '/api/media?id=' || sharetoo_demo_media.id::text
          )
      )`;
      return result;
    });
  } catch (error) {
    if ((error as {code?:string}).code==="23P01") throw new DomainError("overlap","The vehicle has an overlapping allocation.",409);
    throw error;
  }
}
export async function getMedia(id:string) {
  const [row]=await db()<{content_type:string;data:Buffer}[]>`SELECT content_type,data FROM sharetoo_demo_media WHERE id=${id}::uuid`;
  return row;
}
export async function limit(key:string, cap:number, seconds:number) {
  const sql=db();
  const [row] = await sql<{attempts:number}[]>`INSERT INTO sharetoo_demo_limits (key,attempts,expires_at)
    VALUES (${key},1,now() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN sharetoo_demo_limits.expires_at<=now() THEN 1 ELSE sharetoo_demo_limits.attempts + 1 END,
    expires_at=CASE WHEN sharetoo_demo_limits.expires_at<=now() THEN excluded.expires_at ELSE sharetoo_demo_limits.expires_at END
    RETURNING attempts`;
  await sql`DELETE FROM sharetoo_demo_limits WHERE expires_at<now()-interval '1 day'`;
  if (row.attempts>cap) throw new DomainError("limit","Too many attempts. Please try again later.",429);
}
