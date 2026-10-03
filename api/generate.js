import { buildPrompt } from './_shared.js';

export const config = { maxDuration: 300 };

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured on Vercel yet.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const images = formData.getAll('images').filter(file => file && typeof file.arrayBuffer === 'function').slice(0, 8);
    const slot = Number(formData.get('slot') || 0);
    let product = {};
    try { product = JSON.parse(String(formData.get('product') || '{}')); } catch {}

    if (!images.length) return Response.json({ error: 'Upload at least one product image.' }, { status: 400 });
    if (slot < 0 || slot > 9) return Response.json({ error: 'Invalid image slot.' }, { status: 400 });

    const outbound = new FormData();
    outbound.append('model', 'gpt-image-2.5-sunburst');
    outbound.append('prompt', buildPrompt(slot, product));
    outbound.append('size', '1024x1024');
    outbound.append('quality', slot === 0 || slot === 3 ? 'high' : 'medium');
    outbound.append('output_format', 'png');
    outbound.append('background', 'opaque');

    for (const file of images) outbound.append('image[]', file, file.name || 'reference.png');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outbound,
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || `Image generation failed (${response.status})`);
    const image = json?.data?.[0]?.b64_json;
    if (!image) throw new Error('The image model did not return an image.');

    return Response.json({ image, mimeType: 'image/png' });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Image generation failed.' }, { status: 500 });
  }
}
