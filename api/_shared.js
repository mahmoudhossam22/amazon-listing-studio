export const SLOT_CONFIG = [
  {
    title: 'Amazon Main Image',
    instruction: `Create an Amazon MAIN image. Show ONLY the exact product from the reference photos, centered on a pure white (#FFFFFF) seamless background. Product must be fully visible, not cropped, and fill roughly 85% of the frame. Use a clean front or best-selling 3/4 presentation depending on the product. Realistic professional studio lighting with a minimal natural contact shadow only. Absolutely no text, badges, icons, measurements, borders, watermarks, models, hands, decorative props, packaging not included with the product, or extra objects.`,
  },
  {
    title: '45° Product View',
    instruction: `Create a premium studio product photograph on a clean white background from an approximately 45-degree three-quarter angle. Show the product's depth and construction clearly while preserving every real detail. The product should look properly shaped, structured and naturally filled where relevant, with no artificial wrinkles or distortion. No text or extra props.`,
  },
  {
    title: 'Alternate Angle',
    instruction: `Create the most useful alternate product angle that is NOT redundant with a typical main image or 45-degree view. Choose side, back, top or another informative angle based on the references. Use a clean white studio background, show the complete product, and preserve exact proportions and construction. No text or props.`,
  },
  {
    title: 'Detail Close-Up',
    instruction: `Create a high-end macro/detail product photograph focusing on the strongest visible selling detail from the reference images: material texture, stitching, zipper/hardware, finish, pattern, seams or another construction detail. Keep the product identity exact. Use premium soft studio light and a clean neutral-white environment. No invented parts and no text.`,
  },
  {
    title: 'Key Features',
    instruction: `Create a premium Amazon secondary-image infographic. Keep the real product large and visually dominant, using the exact reference product. Add a clean modern layout highlighting ONLY the verified features supplied in the Product DNA. Use short, exact feature labels; do not invent claims. Use tasteful pointers/callouts that do not obscure the product. White or very light neutral background, premium e-commerce design, highly legible typography, no unrelated logos or badges.`,
  },
  {
    title: 'Dimensions',
    instruction: `Create a clean Amazon dimensions graphic using the exact product. If numeric dimensions are provided in Product DNA, show them exactly once with clear measurement lines and units. Do not change or estimate the measurements. If dimensions are missing, DO NOT invent any numbers; instead create a clean technical product view with neutral measurement-line placeholders omitted. White/light background, clear professional hierarchy.`,
  },
  {
    title: 'Lifestyle Use',
    instruction: `Create a photorealistic lifestyle image showing the exact product naturally used in a realistic context appropriate to its category and target customer. Product must remain the visual hero and preserve exact size relationships, material, color, logos, hardware and construction. Do not add unsupported product functionality. Premium commercial photography with believable light and natural composition. No text.`,
  },
  {
    title: 'Lifestyle Alternate',
    instruction: `Create a second lifestyle image using a clearly different but still relevant use case, environment, composition or camera angle from the first lifestyle shot. Keep the exact product identity locked to the references. Make the scene aspirational but believable and commercially useful for an Amazon listing. No text and no unsupported claims.`,
  },
  {
    title: "What's Included",
    instruction: `Create a clean flat-lay or neatly arranged Amazon secondary image showing ONLY the items that are explicitly listed as included in the Product DNA and visible/supported by the references. Do not add accessories or packaging that the customer does not receive. Keep every component accurate. Use a pure white or very light neutral background. Add the small heading "What's Included" only once if it improves clarity.`,
  },
  {
    title: 'Premium Hero',
    instruction: `Create a high-conversion premium hero secondary image for Amazon. Use the exact product as the clear visual focus with sophisticated commercial lighting and a tasteful composition. Communicate the strongest VERIFIED benefit from the Product DNA visually; if useful, include one concise headline based only on verified facts. No exaggerated or unsupported claims. Keep product geometry, construction, materials, colors, logos and hardware exact.`,
  },
];

function baseIdentityPrompt(product) {
  const lines = [
    `PRODUCT IDENTITY LOCK — the uploaded photos are authoritative references for the exact physical product.`,
    `Preserve the same product identity across the result: exact proportions, silhouette, construction, panel geometry, material texture, stitching, seams, zipper count and placement, pockets, openings, handles/straps, attachment points, hardware shape and finish, logo/branding position, pattern, color and all other visible details.`,
    `Do not redesign, simplify, beautify by changing construction, add missing parts, remove parts, merge parts, alter logos, change hardware, change fabric texture, change proportions, or create a different variant.`,
    `When references disagree because of camera angle or lighting, infer the same physical product rather than averaging it into a new design.`,
    `The desired output is a square 1:1 e-commerce image.`,
    product.productName ? `Product name: ${product.productName}` : '',
    product.category ? `Category: ${product.category}` : '',
    product.color ? `Verified color: ${product.color}` : '',
    product.material ? `Verified material: ${product.material}` : '',
    product.dimensions ? `Verified dimensions: ${product.dimensions}` : `Dimensions: not supplied. Never invent numeric measurements.`,
    product.included ? `Items actually included: ${product.included}` : `Included items: not supplied. Do not invent accessories.`,
    product.features ? `Verified product features/claims: ${product.features}` : `Verified features: none supplied. Do not invent claims.`,
    product.lockedDetails ? `Additional details that must not change: ${product.lockedDetails}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildPrompt(slotIndex, product) {
  const slot = SLOT_CONFIG[slotIndex] || SLOT_CONFIG[0];
  return `${baseIdentityPrompt(product)}\n\nIMAGE ROLE: ${slot.title}\n${slot.instruction}\n\nQUALITY: photorealistic premium e-commerce photography, sharp product detail, clean edges, accurate color, realistic material rendering, no visual artifacts.`;
}

export function extractResponseText(json) {
  if (typeof json.output_text === 'string') return json.output_text;
  for (const item of json.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.type === 'output_text' && content.text) return content.text;
      }
    }
  }
  return '';
}

export function cleanJsonText(text) {
  return String(text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}
