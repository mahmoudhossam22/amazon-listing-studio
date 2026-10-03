const MAX_FILES = 8;
const MAX_SIZE = 10 * 1024 * 1024;
const TARGET_REFERENCE_BYTES = 430 * 1024;
const MAX_REFERENCE_DIMENSION = 1600;
let referenceFiles = [];
let results = Array(10).fill(null);
let isGeneratingAll = false;

const slots = [
  { title: 'Amazon Main Image', tag: 'MAIN', desc: 'Pure white background, product only, clean and compliant.' },
  { title: '45° Product View', tag: 'ANGLE', desc: 'Premium three-quarter view showing shape, depth and construction.' },
  { title: 'Alternate Angle', tag: 'ANGLE', desc: 'A useful side, back or top angle selected for this product.' },
  { title: 'Detail Close-Up', tag: 'DETAIL', desc: 'Macro view of texture, stitching, hardware or the strongest detail.' },
  { title: 'Key Features', tag: 'INFO', desc: 'Conversion-focused infographic using verified product features only.' },
  { title: 'Dimensions', tag: 'INFO', desc: 'Clean measurement graphic using the dimensions you provided.' },
  { title: 'Lifestyle Use', tag: 'LIFESTYLE', desc: 'Realistic in-context use with the product remaining visually accurate.' },
  { title: 'Lifestyle Alternate', tag: 'LIFESTYLE', desc: 'A second real-world use case or environment for additional context.' },
  { title: "What's Included", tag: 'PACKAGE', desc: 'Everything the customer receives, neatly arranged and easy to understand.' },
  { title: 'Premium Hero', tag: 'HERO', desc: 'Strong conversion image focused on the primary product benefit.' },
];

const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function getProductData() {
  return {
    productName: $('productName').value.trim(),
    category: $('category').value.trim(),
    color: $('color').value.trim(),
    material: $('material').value.trim(),
    dimensions: $('dimensions').value.trim(),
    included: $('included').value.trim(),
    features: $('features').value.trim(),
    lockedDetails: $('lockedDetails').value.trim(),
  };
}

function updateStats() {
  $('refCount').textContent = referenceFiles.length;
  $('assetCount').textContent = results.filter(Boolean).length;
}

function renderReferences() {
  const grid = $('referenceGrid');
  grid.innerHTML = '';
  referenceFiles.forEach((file, index) => {
    const card = document.createElement('div');
    card.className = 'reference-card';
    const img = document.createElement('img');
    img.alt = `Reference ${index + 1}`;
    img.src = URL.createObjectURL(file);
    const remove = document.createElement('button');
    remove.className = 'remove-ref';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      referenceFiles.splice(index, 1);
      renderReferences();
      updateStats();
    };
    card.append(img, remove);
    grid.appendChild(card);
  });
  updateStats();
}

async function compressReference(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_REFERENCE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));

    async function encode(w, h, startQuality = 0.86) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      let quality = startQuality;
      let blob = null;
      while (quality >= 0.5) {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= TARGET_REFERENCE_BYTES) break;
        quality -= 0.08;
      }
      return blob;
    }

    let blob = await encode(width, height);
    if (blob && blob.size > TARGET_REFERENCE_BYTES) {
      const smallerScale = Math.min(1, 1200 / Math.max(width, height));
      width = Math.max(1, Math.round(width * smallerScale));
      height = Math.max(1, Math.round(height * smallerScale));
      blob = await encode(width, height, 0.78);
    }

    bitmap.close?.();
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'reference';
    return new File([blob], `${baseName}-optimized.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    console.warn('Reference compression skipped:', error);
    return file;
  }
}

async function addFiles(fileList) {
  const incoming = [...fileList].filter(file => file.type.startsWith('image/'));
  if (!incoming.length) return;
  toast('Optimizing reference photos…');
  for (const file of incoming) {
    if (referenceFiles.length >= MAX_FILES) break;
    if (file.size > MAX_SIZE) {
      toast(`${file.name} is larger than 10 MB.`);
      continue;
    }
    const optimized = await compressReference(file);
    referenceFiles.push(optimized);
  }
  renderReferences();
  toast(`${referenceFiles.length} reference photo${referenceFiles.length === 1 ? '' : 's'} ready.`);
}

function renderAssets() {
  const grid = $('assetGrid');
  grid.innerHTML = '';
  slots.forEach((slot, index) => {
    const card = document.createElement('article');
    card.className = 'asset-card';
    card.innerHTML = `
      <div class="asset-preview" id="preview-${index}">
        <div class="placeholder-art">${index + 1}</div>
        <div class="asset-status" id="status-${index}">Ready</div>
      </div>
      <div class="asset-body">
        <div class="asset-index">${String(index + 1).padStart(2,'0')} · ${slot.tag}</div>
        <div class="asset-title">${slot.title}</div>
        <div class="asset-desc">${slot.desc}</div>
        <div class="asset-actions" id="actions-${index}">
          <button class="primary-mini" data-generate="${index}">Generate</button>
          <button data-regenerate="${index}" disabled>Regenerate</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  grid.onclick = async (event) => {
    const gen = event.target.closest('[data-generate]');
    const regen = event.target.closest('[data-regenerate]');
    if (gen) await generateSlot(Number(gen.dataset.generate));
    if (regen) await generateSlot(Number(regen.dataset.regenerate));
  };
}

function setSlotLoading(index, loading) {
  const preview = $(`preview-${index}`);
  if (loading) {
    preview.innerHTML = `<div class="loader"></div><div class="asset-status" id="status-${index}">Generating</div>`;
  } else if (!results[index]) {
    preview.innerHTML = `<div class="placeholder-art">${index + 1}</div><div class="asset-status" id="status-${index}">Ready</div>`;
  }
}

function setSlotResult(index, dataUrl) {
  results[index] = dataUrl;
  const preview = $(`preview-${index}`);
  preview.innerHTML = `<img src="${dataUrl}" alt="${slots[index].title}"/><div class="asset-status done" id="status-${index}">Generated</div>`;
  const actions = $(`actions-${index}`);
  actions.innerHTML = `
    <a href="${dataUrl}" download="listinglab-${String(index + 1).padStart(2,'0')}-${slots[index].title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png">Download</a>
    <button class="primary-mini" data-regenerate="${index}">Regenerate</button>`;
  updateStats();
}

function setSlotError(index, message) {
  results[index] = null;
  const preview = $(`preview-${index}`);
  preview.innerHTML = `<div class="placeholder-art">!</div><div class="asset-status error" id="status-${index}">Error</div>`;
  const actions = $(`actions-${index}`);
  actions.innerHTML = `<button class="primary-mini" data-generate="${index}">Try again</button><button disabled>${message.slice(0,22)}</button>`;
}

function validateReady() {
  if (referenceFiles.length === 0) {
    toast('Upload at least one product reference photo first.');
    $('references').scrollIntoView({behavior:'smooth'});
    return false;
  }
  const data = getProductData();
  if (!data.productName) {
    toast('Add a product name first.');
    $('productName').focus();
    return false;
  }
  return true;
}

async function analyzeProduct() {
  if (referenceFiles.length === 0) {
    toast('Upload product photos first.');
    return;
  }
  const btn = $('analyzeBtn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Analyzing photos…';
  try {
    const fd = new FormData();
    referenceFiles.forEach(file => fd.append('images', file));
    const res = await fetch('/api/analyze', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Analysis failed');
    const d = json.product || {};
    const map = {
      productName: d.productName,
      category: d.category,
      color: d.color,
      material: d.material,
      included: d.included,
      features: Array.isArray(d.features) ? d.features.join(', ') : d.features,
      lockedDetails: Array.isArray(d.lockedDetails) ? d.lockedDetails.join(', ') : d.lockedDetails,
    };
    Object.entries(map).forEach(([key, value]) => { if (value && $(key)) $(key).value = value; });
    $('dnaStatus').textContent = 'AI locked';
    toast('Product DNA extracted. Review it before generation.');
  } catch (error) {
    toast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function generateSlot(index) {
  if (!validateReady()) return false;
  setSlotLoading(index, true);
  try {
    const fd = new FormData();
    referenceFiles.forEach(file => fd.append('images', file));
    fd.append('slot', String(index));
    fd.append('product', JSON.stringify(getProductData()));
    const res = await fetch('/api/generate', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Generation failed');
    if (!json.image) throw new Error('No image returned');
    setSlotResult(index, `data:${json.mimeType || 'image/png'};base64,${json.image}`);
    return true;
  } catch (error) {
    setSlotError(index, error.message || 'Generation failed');
    toast(error.message || 'Generation failed');
    return false;
  }
}

async function generateAll() {
  if (isGeneratingAll || !validateReady()) return;
  isGeneratingAll = true;
  const btn = $('generateAllBtn');
  btn.disabled = true;
  $('progressWrap').classList.remove('hidden');
  let completed = 0;
  for (let i = 0; i < slots.length; i++) {
    $('progressText').textContent = `Generating ${i + 1}/10 · ${slots[i].title}`;
    const pctBefore = Math.round((completed / slots.length) * 100);
    $('progressPct').textContent = `${pctBefore}%`;
    $('progressBar').style.width = `${pctBefore}%`;
    const ok = await generateSlot(i);
    if (ok) completed++;
    const pct = Math.round(((i + 1) / slots.length) * 100);
    $('progressPct').textContent = `${pct}%`;
    $('progressBar').style.width = `${pct}%`;
  }
  $('progressText').textContent = `Finished · ${completed}/10 images generated`;
  btn.disabled = false;
  isGeneratingAll = false;
  toast(`Listing pack finished: ${completed}/10 images.`);
}

function resetAll() {
  referenceFiles = [];
  results = Array(10).fill(null);
  ['productName','category','color','material','dimensions','included','features','lockedDetails'].forEach(id => $(id).value = '');
  $('dnaStatus').textContent = 'Manual';
  renderReferences();
  renderAssets();
  $('progressWrap').classList.add('hidden');
  toast('Workspace reset.');
}

$('fileInput').addEventListener('change', async (e) => { await addFiles(e.target.files); e.target.value = ''; });
$('browseBtn').addEventListener('click', (e) => { e.preventDefault(); $('fileInput').click(); });
$('dropZone').addEventListener('dragover', (e) => { e.preventDefault(); $('dropZone').classList.add('dragover'); });
$('dropZone').addEventListener('dragleave', () => $('dropZone').classList.remove('dragover'));
$('dropZone').addEventListener('drop', async (e) => { e.preventDefault(); $('dropZone').classList.remove('dragover'); await addFiles(e.dataTransfer.files); });
$('analyzeBtn').addEventListener('click', analyzeProduct);
$('generateAllBtn').addEventListener('click', generateAll);
$('generateTopBtn').addEventListener('click', () => { $('results').scrollIntoView({behavior:'smooth'}); setTimeout(generateAll, 350); });
$('resetBtn').addEventListener('click', resetAll);
document.querySelectorAll('[data-scroll]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.scroll).scrollIntoView({behavior:'smooth'})));

renderAssets();
updateStats();

async function checkApiStatus() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    const json = await res.json();
    const label = $('apiStatus');
    const dot = document.querySelector('.status-dot');
    if (res.ok && json.ready) {
      label.textContent = 'AI connection ready';
      if (dot) dot.style.background = '#2a9d67';
    } else {
      label.textContent = 'Add OPENAI_API_KEY in Vercel';
      if (dot) dot.style.background = '#e6873c';
    }
  } catch {
    $('apiStatus').textContent = 'AI status unavailable';
  }
}

checkApiStatus();
