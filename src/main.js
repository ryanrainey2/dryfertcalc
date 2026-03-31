import './style.css'

// ── Constants ──────────────────────────────────────────────────────────────
const PRODUCTS = {
  an:     { n: 0.34, p: 0,    k: 0,    s: 0,    name: 'Nitrate',  color: 'bg-red-500' },
  map:    { n: 0.11, p: 0.52, k: 0,    s: 0,    name: 'MAP',      color: 'bg-orange-500' },
  potash: { n: 0,    p: 0,    k: 0.60, s: 0,    name: 'Potash',   color: 'bg-violet-500' },
  ams:    { n: 0.21, p: 0,    k: 0,    s: 0.24, name: 'AMS',      color: 'bg-emerald-500' },
  gypsum: { n: 0,    p: 0,    k: 0,    s: 0.18, name: 'Gypsum',   color: 'bg-cyan-500' },
}

const DEFAULTS = {
  prices: { an: 650, map: 720, potash: 380, ams: 420, gypsum: 180 },
}

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const val = id => parseFloat($(id).value) || 0
const checked = id => $(id).checked

function toast(msg, type = 'info') {
  const el = $('toast')
  const colors = {
    info:    'bg-zinc-800 border-zinc-700 text-zinc-100',
    success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
    error:   'bg-red-900 border-red-700 text-red-100',
  }
  el.className = `fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl
    transition-all duration-300 border max-w-xs ${colors[type] || colors.info}`
  el.textContent = msg
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  el.style.pointerEvents = 'auto'
  clearTimeout(el._t)
  el._t = setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    el.style.pointerEvents = 'none'
  }, 2800)
}

// ── Price helpers ──────────────────────────────────────────────────────────
function getPrice(key) {
  return parseFloat($('price' + key[0].toUpperCase() + key.slice(1)).value) || 0
}

const priceIds = { an: 'priceAN', map: 'priceMAP', potash: 'pricePotash', ams: 'priceAMS', gypsum: 'priceGypsum' }
function price(key) { return parseFloat($(priceIds[key]).value) || 0 }

function getSelected() {
  return {
    an:     checked('useAN'),
    map:    checked('useMAP'),
    potash: checked('usePotash'),
    ams:    checked('useAMS'),
    gypsum: checked('useGypsum'),
  }
}

// ── Optimization ───────────────────────────────────────────────────────────
function optimizeBlend() {
  const targetN = val('targetN')
  const targetP = val('targetP')
  const targetK = val('targetK')
  const targetS = val('targetS')
  const allowExcess = checked('allowExcess')
  const sel = getSelected()

  let lbsAN = 0, lbsMAP = 0, lbsPotash = 0, lbsAMS = 0, lbsGypsum = 0

  // Phosphate → MAP
  if (targetP > 0 && sel.map) lbsMAP = targetP / 0.52
  // Potash → Potash
  if (targetK > 0 && sel.potash) lbsPotash = targetK / 0.60

  let nFromMAP = lbsMAP * 0.11
  let remainingN = targetN - nFromMAP
  let remainingS = targetS

  // Sulfur: compare cost of AMS vs Gypsum for covering sulfur need
  if (remainingS > 0) {
    let costGypOption = Infinity
    let costAMSOption = Infinity
    const cAN = sel.an ? price('an') / 2000 / 0.34 : Infinity

    if (sel.gypsum) {
      const lbsG = remainingS / 0.18
      const costG = lbsG * (price('gypsum') / 2000)
      const remN = Math.max(0, remainingN)
      const cN = sel.an ? cAN : ((allowExcess && sel.ams) ? price('ams') / 2000 / 0.21 : Infinity)
      costGypOption = costG + remN * Math.min(cAN, (allowExcess && sel.ams) ? price('ams') / 2000 / 0.21 : Infinity)
    }

    if (sel.ams) {
      const lbsA = remainingS / 0.24
      const costA = lbsA * (price('ams') / 2000)
      const nFromA = lbsA * 0.21
      const remN = Math.max(0, remainingN - nFromA)
      const cN = sel.an ? cAN : Infinity
      costAMSOption = costA + remN * Math.min(cAN, (allowExcess && sel.ams) ? price('ams') / 2000 / 0.21 : Infinity)
    }

    if (costAMSOption <= costGypOption && sel.ams) {
      lbsAMS = remainingS / 0.24
      remainingN = Math.max(0, remainingN - lbsAMS * 0.21)
    } else if (sel.gypsum) {
      lbsGypsum = remainingS / 0.18
    }
  }

  // Remaining nitrogen
  if (remainingN > 0) {
    const cAN  = sel.an ? price('an') / 2000 / 0.34 : Infinity
    const cAMS = (allowExcess && sel.ams) ? price('ams') / 2000 / 0.21 : Infinity
    if (cAMS < cAN) {
      lbsAMS += remainingN / 0.21
    } else if (sel.an) {
      lbsAN = remainingN / 0.34
    }
  }

  $('rateAN').value     = lbsAN.toFixed(2)
  $('rateMAP').value    = lbsMAP.toFixed(2)
  $('ratePotash').value = lbsPotash.toFixed(2)
  $('rateAMS').value    = lbsAMS.toFixed(2)
  $('rateGypsum').value = lbsGypsum.toFixed(2)

  $('optimizationNote').classList.remove('hidden')
  $('optimizationWarning').classList.add('hidden')

  calculateAll()
}

// ── Calculate ──────────────────────────────────────────────────────────────
function calculateAll() {
  const rates = {
    an:     val('rateAN'),
    map:    val('rateMAP'),
    potash: val('ratePotash'),
    ams:    val('rateAMS'),
    gypsum: val('rateGypsum'),
  }

  const acres      = val('acres') || 1
  const numBatches = parseInt($('numBatches').value) || 1

  // Costs per acre
  const costs = {}
  let totalCostPerAcre = 0
  for (const [k, r] of Object.entries(rates)) {
    costs[k] = r * (price(k) / 2000)
    totalCostPerAcre += costs[k]
  }

  // Nutrients delivered
  const totalN = rates.an * 0.34 + rates.map * 0.11 + rates.ams * 0.21
  const totalP = rates.map * 0.52
  const totalK = rates.potash * 0.60
  const totalS = rates.ams * 0.24 + rates.gypsum * 0.18

  const totalFieldCost = totalCostPerAcre * acres
  const totalLbsField  = Object.values(rates).reduce((a, b) => a + b, 0) * acres

  // Field info
  $('totalProductNeeded').textContent = totalLbsField.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' lbs'
  $('productPerBatch').textContent    = (numBatches > 0 ? totalLbsField / numBatches : 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' lbs'

  // Cost hero
  $('costPerAcreBig').textContent     = '$' + totalCostPerAcre.toFixed(2)
  $('totalFieldCostSmall').textContent = '$' + totalFieldCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' total field cost'
  $('totalLbs').textContent           = totalLbsField.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' lbs total'

  // Delivered
  $('nDelivered').textContent = totalN.toFixed(1)
  $('pDelivered').textContent = totalP.toFixed(1)
  $('kDelivered').textContent = totalK.toFixed(1)
  $('sDelivered').textContent = totalS.toFixed(1)

  // Breakdown table
  const rows = [
    { key: 'an',     color: '#ef4444', label: 'Nitrate', n: rates.an*0.34, p: 0, k: 0, s: 0 },
    { key: 'map',    color: '#f97316', label: 'MAP',     n: rates.map*0.11, p: rates.map*0.52, k: 0, s: 0 },
    { key: 'potash', color: '#8b5cf6', label: 'Potash',  n: 0, p: 0, k: rates.potash*0.60, s: 0 },
    { key: 'ams',    color: '#10b981', label: 'AMS',     n: rates.ams*0.21, p: 0, k: 0, s: rates.ams*0.24 },
    { key: 'gypsum', color: '#06b6d4', label: 'Gypsum',  n: 0, p: 0, k: 0, s: rates.gypsum*0.18 },
  ]
  $('breakdownBody').innerHTML = rows.map(r => `
    <tr class="hover:bg-zinc-800/30 transition-colors">
      <td class="px-3 py-2.5 font-medium flex items-center gap-2">
        <span class="w-3 h-3 rounded-full inline-block shrink-0" style="background:${r.color}"></span>
        ${r.label}
      </td>
      <td class="px-3 py-2.5 text-right">${rates[r.key].toFixed(2)}</td>
      <td class="px-3 py-2.5 text-right">$${costs[r.key].toFixed(2)}</td>
      <td class="px-3 py-2.5 text-right">${r.n.toFixed(1)}</td>
      <td class="px-3 py-2.5 text-right">${r.p.toFixed(1)}</td>
      <td class="px-3 py-2.5 text-right">${r.k.toFixed(1)}</td>
      <td class="px-3 py-2.5 text-right">${r.s.toFixed(1)}</td>
    </tr>
  `).join('')

  // Cost per lb nutrient
  const cAN_per_lb = price('an') / 2000 / 0.34

  let unitN = '—', unitP = '—', unitK = '—', unitS = '—'

  if (rates.an > 0)     unitN = '$' + cAN_per_lb.toFixed(3)
  else if (rates.ams > 0) unitN = '$' + (price('ams') / 2000 / 0.21).toFixed(3)

  if (rates.map > 0) {
    const nCredit = 0.11 * 2000 * cAN_per_lb
    const effMap  = Math.max(0, price('map') - nCredit)
    unitP = '$' + (effMap / 2000 / 0.52).toFixed(3)
  }

  if (rates.potash > 0) unitK = '$' + (price('potash') / 2000 / 0.60).toFixed(3)

  if (rates.ams > 0) {
    const nCredit = 0.21 * 2000 * cAN_per_lb
    const effAMS  = Math.max(0, price('ams') - nCredit)
    unitS = '$' + (effAMS / 2000 / 0.24).toFixed(3)
  } else if (rates.gypsum > 0) {
    unitS = '$' + (price('gypsum') / 2000 / 0.18).toFixed(3)
  }

  $('costPerLbN').textContent = unitN
  $('costPerLbP').textContent = unitP
  $('costPerLbK').textContent = unitK
  $('costPerLbS').textContent = unitS
}

// ── Storage ────────────────────────────────────────────────────────────────
function saveDefaultPrices() {
  localStorage.setItem('dfc_prices', JSON.stringify({
    an: $('priceAN').value, map: $('priceMAP').value,
    potash: $('pricePotash').value, ams: $('priceAMS').value, gypsum: $('priceGypsum').value,
  }))
}

function loadDefaultPrices() {
  const saved = localStorage.getItem('dfc_prices')
  if (!saved) return
  const p = JSON.parse(saved)
  $('priceAN').value     = p.an     || DEFAULTS.prices.an
  $('priceMAP').value    = p.map    || DEFAULTS.prices.map
  $('pricePotash').value = p.potash || DEFAULTS.prices.potash
  $('priceAMS').value    = p.ams    || DEFAULTS.prices.ams
  $('priceGypsum').value = p.gypsum || DEFAULTS.prices.gypsum
}

function saveBlend() {
  const name = $('blendName').value.trim()
  if (!name) { toast('Enter a blend name first', 'error'); return }

  const data = {
    prices: { an: $('priceAN').value, map: $('priceMAP').value, potash: $('pricePotash').value, ams: $('priceAMS').value, gypsum: $('priceGypsum').value },
    selected: getSelected(),
    acres: $('acres').value,
    numBatches: $('numBatches').value,
    cartRental: checked('cartRental'),
    customerName: $('customerName').value,
    targets: { n: $('targetN').value, p: $('targetP').value, k: $('targetK').value, s: $('targetS').value },
    allowExcess: checked('allowExcess'),
    notes: $('notes').value,
    rates: { an: $('rateAN').value, map: $('rateMAP').value, potash: $('ratePotash').value, ams: $('rateAMS').value, gypsum: $('rateGypsum').value },
  }

  const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
  blends[name] = data
  localStorage.setItem('dfc_blends', JSON.stringify(blends))
  loadSavedList()
  toast(`"${name}" saved!`, 'success')
}

function loadSavedList() {
  const sel = $('savedBlends')
  const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
  const current = sel.value
  sel.innerHTML = '<option value="">-- Select blend --</option>'
  Object.keys(blends).forEach(name => {
    const opt = document.createElement('option')
    opt.value = name; opt.textContent = name
    if (name === current) opt.selected = true
    sel.appendChild(opt)
  })
}

function loadBlend() {
  const name = $('savedBlends').value
  if (!name) { toast('Select a blend to load', 'error'); return }
  const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
  const d = blends[name]
  if (!d) return

  $('priceAN').value     = d.prices.an
  $('priceMAP').value    = d.prices.map
  $('pricePotash').value = d.prices.potash
  $('priceAMS').value    = d.prices.ams
  $('priceGypsum').value = d.prices.gypsum

  $('useAN').checked     = d.selected.an
  $('useMAP').checked    = d.selected.map
  $('usePotash').checked = d.selected.potash
  $('useAMS').checked    = d.selected.ams
  $('useGypsum').checked = d.selected.gypsum

  $('acres').value       = d.acres
  $('numBatches').value  = d.numBatches || 1
  $('cartRental').checked = d.cartRental || false
  $('customerName').value = d.customerName || ''

  $('targetN').value     = d.targets.n
  $('targetP').value     = d.targets.p
  $('targetK').value     = d.targets.k
  $('targetS').value     = d.targets.s
  $('allowExcess').checked = d.allowExcess
  $('notes').value       = d.notes || ''
  $('blendName').value   = name

  if (d.rates) {
    $('rateAN').value     = d.rates.an     || 0
    $('rateMAP').value    = d.rates.map    || 0
    $('ratePotash').value = d.rates.potash || 0
    $('rateAMS').value    = d.rates.ams    || 0
    $('rateGypsum').value = d.rates.gypsum || 0
  }

  calculateAll()
  toast(`Loaded "${name}"`, 'success')
}

function deleteBlend() {
  const name = $('savedBlends').value
  if (!name) { toast('Select a blend to delete', 'error'); return }
  if (!confirm(`Delete blend "${name}"?`)) return
  const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
  delete blends[name]
  localStorage.setItem('dfc_blends', JSON.stringify(blends))
  loadSavedList()
  toast(`"${name}" deleted`, 'info')
}

function resetAll() {
  if (!confirm('Reset everything to defaults?')) return
  $('blendName').value    = ''
  $('customerName').value = ''
  $('cartRental').checked = false
  $('notes').value        = ''
  $('acres').value        = 120
  $('numBatches').value   = 1
  $('targetN').value      = 40
  $('targetP').value      = 40
  $('targetK').value      = 40
  $('targetS').value      = 20
  $('allowExcess').checked = true
  $('autoOptimize').checked = true
  ;['an','map','potash','ams','gypsum'].forEach(k => {
    $('use' + k[0].toUpperCase() + k.slice(1)).checked = true
    ;['AN','MAP','Potash','AMS','Gypsum'].forEach((cap, i) => {
      if (['an','map','potash','ams','gypsum'][i] === k) {
        $('price' + cap).value = DEFAULTS.prices[k]
        $('rate' + cap).value  = 0
      }
    })
  })
  $('priceAN').value     = DEFAULTS.prices.an
  $('priceMAP').value    = DEFAULTS.prices.map
  $('pricePotash').value = DEFAULTS.prices.potash
  $('priceAMS').value    = DEFAULTS.prices.ams
  $('priceGypsum').value = DEFAULTS.prices.gypsum
  $('rateAN').value      = 0
  $('rateMAP').value     = 0
  $('ratePotash').value  = 0
  $('rateAMS').value     = 0
  $('rateGypsum').value  = 0
  $('optimizationNote').classList.add('hidden')
  calculateAll()
  toast('Reset to defaults', 'info')
}

// ── PDF: Quote ─────────────────────────────────────────────────────────────
function printQuote() {
  const notes      = $('notes').value || 'No notes provided'
  const customer   = $('customerName').value || 'N/A'
  const blendName  = $('blendName').value || 'Unnamed Blend'
  const cartRental = checked('cartRental') ? '✓ Cart Rental' : ''

  const html = `
    <div style="padding:40px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div>
          <h1 style="color:#059669;font-size:26px;margin:0;">Dry Fertilizer Quote</h1>
          <p style="color:#666;margin:4px 0 0;">${new Date().toLocaleDateString()}</p>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Customer:</strong> ${customer}</div>
          <div><strong>Blend:</strong> ${blendName}</div>
          ${cartRental ? `<div style="color:#d97706;">${cartRental}</div>` : ''}
        </div>
      </div>
      <hr style="border-color:#ddd;margin-bottom:24px;">

      <h2 style="font-size:16px;color:#333;margin:0 0 8px;">Customer / Field Notes</h2>
      <p style="background:#f5f5f5;padding:12px;border-radius:8px;color:#333;white-space:pre-wrap;">${notes}</p>

      <h2 style="font-size:16px;color:#333;margin:20px 0 8px;">Target Nutrient Analysis (lbs/acre)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr style="background:#f0fdf4;">
          <th style="padding:10px 14px;text-align:left;border:1px solid #d1fae5;color:#065f46;">N</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid #d1fae5;color:#065f46;">P₂O₅</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid #d1fae5;color:#065f46;">K₂O</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid #d1fae5;color:#065f46;">S</th>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #ddd;font-size:20px;font-weight:bold;">${$('targetN').value}</td>
          <td style="padding:10px 14px;border:1px solid #ddd;font-size:20px;font-weight:bold;">${$('targetP').value}</td>
          <td style="padding:10px 14px;border:1px solid #ddd;font-size:20px;font-weight:bold;">${$('targetK').value}</td>
          <td style="padding:10px 14px;border:1px solid #ddd;font-size:20px;font-weight:bold;">${$('targetS').value}</td>
        </tr>
      </table>

      <h2 style="font-size:16px;color:#333;margin:20px 0 8px;">Recommended Rates (lbs/acre)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr style="background:#f5f5f5;">
          <th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">lbs/acre</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Cost/acre</th>
        </tr>
        ${[
          { label:'Nitrate 34-0-0',       id:'rateAN',     priceKey:'an' },
          { label:'MAP 11-52-0',          id:'rateMAP',    priceKey:'map' },
          { label:'Potash 0-0-60',        id:'ratePotash', priceKey:'potash' },
          { label:'AMS 21-0-0-24S',       id:'rateAMS',    priceKey:'ams' },
          { label:'Gypsum 0-0-0-18S',     id:'rateGypsum', priceKey:'gypsum' },
        ].map(r => {
          const lbs  = parseFloat($(r.id).value) || 0
          const cost = lbs * price(r.priceKey) / 2000
          return `<tr>
            <td style="padding:8px 12px;border:1px solid #ddd;">${r.label}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${lbs.toFixed(2)}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">$${cost.toFixed(2)}</td>
          </tr>`
        }).join('')}
      </table>

      <div style="background:#ecfdf5;padding:20px;border-radius:12px;margin:20px 0;display:flex;justify-content:space-between;">
        <div>
          <div style="color:#065f46;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Price Per Acre</div>
          <div style="font-size:40px;font-weight:bold;color:#111;">${$('costPerAcreBig').textContent}</div>
          <div style="color:#065f46;">${$('totalFieldCostSmall').textContent}</div>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Acres:</strong> ${$('acres').value}</div>
          <div><strong>Total lbs:</strong> ${$('totalLbs').textContent}</div>
          <div><strong>N delivered:</strong> ${$('nDelivered').textContent} lbs/acre</div>
          <div><strong>P₂O₅ delivered:</strong> ${$('pDelivered').textContent} lbs/acre</div>
          <div><strong>K₂O delivered:</strong> ${$('kDelivered').textContent} lbs/acre</div>
          <div><strong>S delivered:</strong> ${$('sDelivered').textContent} lbs/acre</div>
        </div>
      </div>

      <p style="font-size:11px;color:#999;text-align:center;margin-top:32px;">
        © 2026 Aric Jennings · Dry Fertilizer Optimizer v2.0 · Generated ${new Date().toLocaleString()}
      </p>
    </div>`

  html2pdf().set({
    margin: 0, filename: `quote-${blendName.replace(/\s+/g,'-')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  }).from(html).save()
}

// ── PDF: Blend Sheet ───────────────────────────────────────────────────────
function printBlendSheet() {
  const customer  = $('customerName').value
  if (!customer) { toast('Enter a customer name first', 'error'); return }

  const blendName  = $('blendName').value || 'Unnamed Blend'
  const acres      = val('acres')
  const numBatches = parseInt($('numBatches').value) || 1
  const notes      = $('notes').value || ''
  const cartRental = checked('cartRental')

  const products = [
    { label: 'Nitrate 34-0-0',    id: 'rateAN',     priceKey: 'an',     color: '#ef4444' },
    { label: 'MAP 11-52-0',       id: 'rateMAP',    priceKey: 'map',    color: '#f97316' },
    { label: 'Potash 0-0-60',     id: 'ratePotash', priceKey: 'potash', color: '#8b5cf6' },
    { label: 'AMS 21-0-0-24S',    id: 'rateAMS',    priceKey: 'ams',    color: '#10b981' },
    { label: 'Gypsum 0-0-0-18S',  id: 'rateGypsum', priceKey: 'gypsum', color: '#06b6d4' },
  ]

  // Compute per-batch weights and cumulative
  const batchRows = products.map(p => {
    const lbsPerAcre = parseFloat($(p.id).value) || 0
    const totalLbs   = lbsPerAcre * acres
    const perBatch   = totalLbs / numBatches
    const tons       = totalLbs / 2000
    return { ...p, lbsPerAcre, totalLbs, perBatch, tons }
  }).filter(r => r.lbsPerAcre > 0)

  let cumulative = 0
  const batchTableRows = batchRows.map(r => {
    cumulative += r.perBatch
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:500;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:6px;"></span>
        ${r.label}
      </td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.lbsPerAcre.toFixed(2)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${r.perBatch.toFixed(0)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#f0fdf4;font-weight:bold;">${cumulative.toFixed(0)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${(r.tons).toFixed(2)}</td>
    </tr>`
  }).join('')

  // Checklist rows for each batch
  const checklistRows = Array.from({ length: numBatches }, (_, i) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
      <td style="padding:6px 12px;border:1px solid #ddd;width:120px;"></td>
      <td style="padding:6px 12px;border:1px solid #ddd;width:80px;"></td>
      <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-size:18px;">☐</td>
    </tr>`).join('')

  const html = `
    <div style="padding:36px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <h1 style="font-size:24px;margin:0;color:#d97706;">Blend Sheet</h1>
          <p style="margin:4px 0 0;color:#666;">${new Date().toLocaleDateString()}</p>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Customer:</strong> ${customer}</div>
          <div><strong>Blend:</strong> ${blendName}</div>
          <div><strong>Acres:</strong> ${acres}</div>
          <div><strong>Batches:</strong> ${numBatches}</div>
          ${cartRental ? '<div style="color:#d97706;font-weight:bold;">CART RENTAL</div>' : ''}
        </div>
      </div>
      <hr style="border-color:#ddd;margin-bottom:20px;">

      ${notes ? `<p style="background:#fffbeb;border:1px solid #fde68a;padding:10px 14px;border-radius:8px;font-size:13px;color:#333;margin-bottom:20px;white-space:pre-wrap;">${notes}</p>` : ''}

      <h2 style="font-size:15px;margin:0 0 8px;">Loading Sequence (per batch of ${(batchRows.reduce((a,r)=>a+r.perBatch,0)).toFixed(0)} lbs)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr style="background:#fef3c7;">
          <th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">lbs/acre</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">lbs/batch</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;background:#f0fdf4;">Cumulative Scale</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Total Tons</th>
        </tr>
        ${batchTableRows}
      </table>

      <h2 style="font-size:15px;margin:0 0 8px;">Batch Completion Log</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <tr style="background:#f5f5f5;">
          <th style="padding:6px 12px;border:1px solid #ddd;text-align:center;">Batch #</th>
          <th style="padding:6px 12px;border:1px solid #ddd;">Date / Time</th>
          <th style="padding:6px 12px;border:1px solid #ddd;">Initials</th>
          <th style="padding:6px 12px;border:1px solid #ddd;text-align:center;">Done</th>
        </tr>
        ${checklistRows}
      </table>

      <div style="border:1px solid #ddd;padding:16px;border-radius:8px;font-size:13px;color:#333;">
        <div style="display:flex;gap:40px;flex-wrap:wrap;">
          <div>
            <strong>Total Delivered</strong><br/>
            N: ${$('nDelivered').textContent} lbs/acre<br/>
            P₂O₅: ${$('pDelivered').textContent} lbs/acre<br/>
            K₂O: ${$('kDelivered').textContent} lbs/acre<br/>
            S: ${$('sDelivered').textContent} lbs/acre
          </div>
          <div>
            <strong>Cost Summary</strong><br/>
            Per Acre: ${$('costPerAcreBig').textContent}<br/>
            Total Field: ${$('totalFieldCostSmall').textContent.replace(' total field cost','')}<br/>
            Total lbs: ${$('totalLbs').textContent}
          </div>
        </div>
      </div>

      <p style="font-size:11px;color:#999;text-align:center;margin-top:28px;">
        © 2026 Aric Jennings · Dry Fertilizer Optimizer v2.0
      </p>
    </div>`

  html2pdf().set({
    margin: 0, filename: `blend-sheet-${blendName.replace(/\s+/g,'-')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  }).from(html).save()
}

// ── UI Wiring ──────────────────────────────────────────────────────────────
function initUI() {
  // Save buttons
  $('btnSaveHeader').addEventListener('click', saveBlend)
  $('btnSaveMob').addEventListener('click', saveBlend)

  // Quote / Blend Sheet
  $('btnQuote').addEventListener('click', printQuote)
  $('btnBlend').addEventListener('click', printBlendSheet)
  $('btnQuoteMob').addEventListener('click', printQuote)
  $('btnBlendMob').addEventListener('click', printBlendSheet)

  // Reset
  $('btnReset').addEventListener('click', resetAll)
  $('btnResetMob').addEventListener('click', resetAll)

  // Load / Delete saved blends
  $('btnLoad').addEventListener('click', loadBlend)
  $('btnDelete').addEventListener('click', deleteBlend)

  // Optimize
  $('btnOptimize').addEventListener('click', optimizeBlend)

  // Mobile menu toggle
  $('btnMenuToggle').addEventListener('click', () => {
    const menu = $('mobileMenu')
    menu.classList.toggle('hidden')
    menu.classList.toggle('flex')
  })

  // Sidebar collapse (mobile)
  $('sidebarToggle').addEventListener('click', () => {
    const content = $('sidebarContent')
    const arrow   = $('sidebarArrow')
    content.classList.toggle('hidden')
    arrow.textContent = content.classList.contains('hidden') ? '▼' : '▲'
  })

  // Auto-optimize on target change
  const targetInputs = ['targetN','targetP','targetK','targetS']
  targetInputs.forEach(id => {
    $(id).addEventListener('input', () => {
      if (checked('autoOptimize')) optimizeBlend()
    })
  })

  // Recalculate on rate/price/acre change
  const calcInputs = ['rateAN','rateMAP','ratePotash','rateAMS','rateGypsum',
                      'priceAN','priceMAP','pricePotash','priceAMS','priceGypsum',
                      'acres','numBatches']
  calcInputs.forEach(id => $(id).addEventListener('input', calculateAll))

  // Save prices as defaults on change
  ;['priceAN','priceMAP','pricePotash','priceAMS','priceGypsum'].forEach(id => {
    $(id).addEventListener('change', saveDefaultPrices)
  })

  // Re-optimize when checkboxes change and auto-optimize is on
  ;['useAN','useMAP','usePotash','useAMS','useGypsum','allowExcess'].forEach(id => {
    $(id).addEventListener('change', () => {
      if (checked('autoOptimize')) optimizeBlend()
      else calculateAll()
    })
  })
}

// ── Init ───────────────────────────────────────────────────────────────────
loadDefaultPrices()
loadSavedList()
initUI()
optimizeBlend()
