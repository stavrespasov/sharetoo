export function hosted() {
  return Boolean(process.env.DATABASE_URL && process.env.DEMO_ADMIN_PASSWORD && process.env.DEMO_SESSION_SECRET);
}
