export function GET() {
  const ready = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
  return Response.json({ ready, provider: 'cloudflare-workers-ai' });
}
