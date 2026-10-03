import sharp from 'sharp';
import { buildPrompt } from './_shared.js';

export const config = { maxDuration: 300 };

function getCloudflareError(json, status) {
  const message = json?.errors?.[0]?.message || json?.error || `Cloudflare image generation failed (${status})`;
  if (status === 429) return 'Daily free AI limit reached on Cloudflare. Try again after the daily reset.';
  if (status === 403) return `Cloudflare access error: ${message}`;
  return message;
}

function detectMime(base64) {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

async function prepareReference(file, index) {
  const original = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(original)
    .rotate()
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return new File([resized], `reference-${index + 1}.jpg`, { type: 'image/jpeg' });
}

export async function POST(request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return Response.json({ error: 'Cloudflare Workers AI is not configured on Vercel yet.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const images = formData.getAll('images').filter(file => file && typeof file.arrayBuffer === 'function').slice(0, 4);
    const slot = Number(formData.get('slot') || 0);
    let product = {};
    try { product = JSON.parse(String(formData.get('product') || '{}')); } catch {}

    if (!images.length) return Response.json({ error: 'Upload at least one product image.' }, { status: 400 });
    if (slot < 0 || slot > 9) return Response.json({ error: 'Invalid image slot.' }, { status: 400 });

    const outbound = new FormData();
    outbound.append('prompt', buildPrompt(slot, product));
    outbound.append('width', '1024');
    outbound.append('height', '1024');
    outbound.append('guidance', '3.5');

    for (let index = 0; index < images.length; index++) {
      const prepared = await prepareReference(images[index], index);
      outbound.append(`input_image_${index}`, prepared, prepared.name);
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
        body: outbound,
      },
    );

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      if (!response.ok) throw new Error(`Cloudflare image generation failed (${response.status})`);
      const buffer = Buffer.from(await response.arrayBuffer());
      return Response.json({ image: buffer.toString('base64'), mimeType: contentType.split(';')[0] });
    }

    const json = await response.json();
    if (!response.ok || json?.success === false) throw new Error(getCloudflareError(json, response.status));

    let image = json?.result?.image || json?.image || '';
    if (!image && typeof json?.result === 'string') image = json.result;
    if (!image) throw new Error('Cloudflare did not return an image.');
    image = String(image).replace(/^data:image\/[^;]+;base64,/, '');

    return Response.json({ image, mimeType: detectMime(image) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Image generation failed.' }, { status: 500 });
  }
}
