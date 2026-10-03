import { cleanJsonText } from './_shared.js';

export const config = { maxDuration: 300 };

export async function POST(request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return Response.json({ error: 'Cloudflare Workers AI is not configured on Vercel yet.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const image = formData.getAll('images').find(file => file && typeof file.arrayBuffer === 'function');
    if (!image) return Response.json({ error: 'Upload at least one image.' }, { status: 400 });

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageData = `data:${image.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
    const question = `Analyze this e-commerce product photo and extract stable physical facts only. Do not invent dimensions, materials, features or included items that cannot be visually verified. Return ONLY valid JSON in exactly this shape:\n{\n  "productName": "short generic product name",\n  "category": "best-fit category",\n  "color": "most accurate color description",\n  "material": "material if visually reliable, otherwise empty string",\n  "included": "visible included pieces only, otherwise empty string",\n  "features": ["3-6 concise visible/verifiable features"],\n  "lockedDetails": ["5-10 identity details that image generation must preserve exactly"]\n}`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/moondream/moondream3.1-9B-A2B`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: 'query',
          image: imageData,
          question,
          reasoning: false,
          stream: false,
          temperature: 0.1,
          max_tokens: 1200,
        }),
      },
    );

    const json = await response.json();
    if (!response.ok || json?.success === false) {
      const message = json?.errors?.[0]?.message || `Cloudflare analysis failed (${response.status})`;
      if (response.status === 429) throw new Error('Daily free AI limit reached on Cloudflare. Try again after the daily reset.');
      throw new Error(message);
    }

    const answer = json?.result?.answer || json?.answer || json?.result?.response || '';
    const text = cleanJsonText(answer);
    let product;
    try { product = JSON.parse(text); }
    catch { throw new Error('The product analysis returned an invalid format. You can fill Product DNA manually or try another reference photo.'); }

    return Response.json({ product, provider: 'cloudflare-workers-ai' });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Product analysis failed.' }, { status: 500 });
  }
}
