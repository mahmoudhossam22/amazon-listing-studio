export function GET() {
  return Response.json({ ready: Boolean(process.env.OPENAI_API_KEY) });
}
