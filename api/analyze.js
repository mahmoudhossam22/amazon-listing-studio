import { extractResponseText, cleanJsonText } from './_shared.js';

export const config = { maxDuration: 300 };

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured on Vercel yet.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const images = formData.getAll('images').filter(file => file && typeof file.arrayBuffer === 'function').slice(0, 8);
    if (!images.length) return Response.json({ error: 'Upload at least one image.' }, { status: 400 });

    const content = [{
      type: 'input_text',
      text: `Analyze these photos as multiple views of ONE e-commerce product. Extract stable physical facts only. Do not invent dimensions, materials, features or included items when they cannot be confirmed visually. Return ONLY valid JSON using this exact shape:\n{\n  "productName": "short generic product name",\n  "category": "best-fit category",\n  "color": "most accurate color description",\n  "material": "material if visually reliable, otherwise empty string",\n  "included": "visible included pieces only, otherwise empty string",\n  "features": ["3-6 concise visible/verifiable features"],\n  "lockedDetails": ["5-10 identity details that image generation must preserve exactly"]\n}`
    }];

    for (const file of images) {
      const buffer = Buffer.from(await file.arrayBuffer());
      content.push({
        type: 'input_image',
        image_url: `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`,
        detail: 'high',
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-6-luna',
        input: [{ role: 'user', content }],
        reasoning: { effort: 'low' },
      }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || `OpenAI analysis failed (${response.status})`);

    const text = cleanJsonText(extractResponseText(json));
    let product;
    try { product = JSON.parse(text); }
    catch { throw new Error('The product analysis returned an invalid format. Try again.'); }

    return Response.json({ product });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Product analysis failed.' }, { status: 500 });
  }
}
