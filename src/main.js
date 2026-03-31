import './style.css'

// ── Product Definitions ────────────────────────────────────────────────────
const DRY_PRODUCTS = {
  an:     { n: 0.34, p: 0,    k: 0,    s: 0,    name: 'Nitrate',  abbr: 'AN',  analysis: '34-0-0',      color: '#ef4444', defaultPrice: 650 },
  map:    { n: 0.11, p: 0.52, k: 0,    s: 0,    name: 'MAP',      abbr: 'MAP', analysis: '11-52-0',     color: '#f97316', defaultPrice: 720 },
  potash: { n: 0,    p: 0,    k: 0.60, s: 0,    name: 'Potash',   abbr: 'K',   analysis: '0-0-60',      color: '#8b5cf6', defaultPrice: 380 },
  ams:    { n: 0.21, p: 0,    k: 0,    s: 0.24, name: 'AMS',      abbr: 'AMS', analysis: '21-0-0-24S',  color: '#10b981', defaultPrice: 420 },
  gypsum: { n: 0,    p: 0,    k: 0,    s: 0.18, name: 'Gypsum',   abbr: 'GYP', analysis: '0-0-0-18S',   color: '#06b6d4', defaultPrice: 180 },
}

const LIQUID_PRODUCTS = {
  uan32:  { n: 0.32, p: 0,    k: 0,    s: 0,    name: 'UAN 32',   abbr: '32',  analysis: '32-0-0',      color: '#ef4444', defaultPrice: 300, lbsPerGal: 11.06 },
  uan28:  { n: 0.28, p: 0,    k: 0,    s: 0,    name: 'UAN 28',   abbr: '28',  analysis: '28-0-0',      color: '#f87171', defaultPrice: 260, lbsPerGal: 10.67 },
  app:    { n: 0.10, p: 0.34, k: 0,    s: 0,    name: '10-34-0',  abbr: 'APP', analysis: '10-34-0',     color: '#f97316', defaultPrice: 480, lbsPerGal: 11.65 },
  ats:    { n: 0.12, p: 0,    k: 0,    s: 0.26, name: 'ATS',      abbr: 'ATS', analysis: '12-0-0-26S',  color: '#10b981', defaultPrice: 320, lbsPerGal: 11.06 },
  kts:    { n: 0,    p: 0,    k: 0.25, s: 0.17, name: 'KTS',      abbr: 'KTS', analysis: '0-0-25-17S',  color: '#8b5cf6', defaultPrice: 380, lbsPerGal: 12.24 },
}

// ── State ──────────────────────────────────────────────────────────────────
let mode = 'dry' // 'dry' | 'liquid'
let theme = localStorage.getItem('dfc_theme') || 'dark'

function products() { return mode === 'dry' ? DRY_PRODUCTS : LIQUID_PRODUCTS }
function productKeys() { return Object.keys(products()) }

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const val = id => parseFloat($(id)?.value) || 0
const checked = id => $(id)?.checked || false

function toast(msg, type = 'info') {
  const el = $('toast')
  const colors = { info: 'bg-zinc-800 border-zinc-700 text-zinc-100', success: 'bg-emerald-900 border-emerald-700 text-emerald-100', error: 'bg-red-900 border-red-700 text-red-100' }
  el.className = `fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all duration-300 border max-w-xs ${colors[type] || colors.info}`
  el.textContent = msg
  el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.pointerEvents = 'auto'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.pointerEvents = 'none' }, 2800)
}

function applyTheme() {
  document.documentElement.classList.toggle('light', theme === 'light')
  const icon = theme === 'light' ? '🌙' : '☀️'
  if ($('btnTheme')) $('btnTheme').textContent = icon
  if ($('btnThemeMob')) $('btnThemeMob').textContent = icon
  localStorage.setItem('dfc_theme', theme)
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme()
}

function priceId(key) { return `price_${key}` }
function useId(key)   { return `use_${key}` }
function rateId(key)  { return `rate_${key}` }

function getPrice(key) { return parseFloat($(`price_${key}`)?.value) || 0 }

// For dry: price is $/ton → cost per lb = price/2000
// For liquid: price is $/ton → cost per lb = price/2000 (same unit at wholesale)
function costPerLb(key) {
  return getPrice(key) / 2000
}

function getSelected() {
  const sel = {}
  for (const k of productKeys()) sel[k] = checked(useId(k))
  return sel
}

function getRates() {
  const rates = {}
  for (const k of productKeys()) rates[k] = val(rateId(k))
  return rates
}

// ── Render Products Sidebar ────────────────────────────────────────────────
function renderProducts() {
  const prods = products()
  const container = $('productsContainer')
  container.innerHTML = productKeys().map(key => {
    const p = prods[key]
    const savedPrices = JSON.parse(localStorage.getItem(`dfc_${mode}_prices`) || '{}')
    const priceVal = savedPrices[key] || p.defaultPrice
    return `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <input type="checkbox" id="${useId(key)}" checked class="w-4 h-4 shrink-0" style="accent-color:${p.color}" />
          <div class="badge" style="background:${p.color}">${p.abbr}</div>
          <div>
            <div class="font-medium text-sm">${p.name}</div>
            <div class="text-xs text-zinc-500">${p.analysis}${p.lbsPerGal ? ` · ${p.lbsPerGal} lb/gal` : ''}</div>
          </div>
        </div>
        <input id="${priceId(key)}" type="number" step="1" value="${priceVal}"
          class="w-20 text-right inp py-1.5 rounded-xl text-sm font-semibold" />
      </div>`
  }).join('')

  // Price unit badge
  $('priceUnitBadge').textContent = '$/TON'

  // Wire events on new inputs
  for (const k of productKeys()) {
    $(`price_${k}`)?.addEventListener('input', calculateAll)
    $(`price_${k}`)?.addEventListener('change', savePrices)
    $(`use_${k}`)?.addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
  }
}

// ── Render Rate Outputs ────────────────────────────────────────────────────
function renderRates() {
  const prods = products()
  const unit = mode === 'dry' ? 'lbs/acre' : 'gal/acre'
  $('rateUnitLabel').textContent = unit
  $('thRate').textContent = unit

  $('ratesContainer').innerHTML = productKeys().map(key => {
    const p = prods[key]
    return `
      <div>
        <div class="flex items-center gap-1 mb-1.5">
          <div class="w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:${p.color}">${p.abbr.substring(0,2)}</div>
          <span class="text-xs font-medium truncate">${p.name}</span>
        </div>
        <input id="${rateId(key)}" type="number" step="0.01" value="0" readonly class="inp-xl-ro" />
        <div class="text-center text-xs text-zinc-600 mt-1">${unit}</div>
      </div>`
  }).join('')
}

// ── Optimization ───────────────────────────────────────────────────────────
function optimizeBlend() {
  const targetN = val('targetN'), targetP = val('targetP'), targetK = val('targetK'), targetS = val('targetS')
  const allowExcess = checked('allowExcess')
  const sel = getSelected()
  const prods = products()
  const keys = productKeys()

  // Initialize rates to 0 (in lbs/acre for both modes — we'll convert liquid to gal at the end)
  const lbs = {}
  keys.forEach(k => lbs[k] = 0)

  // Find the primary source for each nutrient
  // Phosphate source
  const pKey = keys.find(k => sel[k] && prods[k].p > 0)
  if (targetP > 0 && pKey) lbs[pKey] = targetP / prods[pKey].p

  // Potash source
  const kKey = keys.find(k => sel[k] && prods[k].k > 0 && prods[k].p === 0)
  if (targetK > 0 && kKey) lbs[kKey] = targetK / prods[kKey].k

  // Track N already covered by multi-nutrient products
  let coveredN = 0
  keys.forEach(k => { if (lbs[k] > 0) coveredN += lbs[k] * prods[k].n })
  let remainingN = Math.max(0, targetN - coveredN)

  // Sulfur — compare cost of sulfur-only vs sulfur+N sources
  let remainingS = targetS
  // Subtract sulfur already covered by existing allocations
  keys.forEach(k => { if (lbs[k] > 0) remainingS -= lbs[k] * prods[k].s })
  remainingS = Math.max(0, remainingS)

  if (remainingS > 0) {
    // Find sulfur sources
    const sSources = keys.filter(k => sel[k] && prods[k].s > 0 && lbs[k] === 0)
    const sWithN = sSources.filter(k => prods[k].n > 0)
    const sOnly  = sSources.filter(k => prods[k].n === 0)

    // Primary N source for cost comparison
    const nSources = keys.filter(k => sel[k] && prods[k].n > 0 && prods[k].p === 0 && prods[k].s === 0)
    const cheapestNcost = nSources.length > 0 ? Math.min(...nSources.map(k => costPerLb(k) / prods[k].n)) : Infinity

    let bestCost = Infinity, bestKey = null
    for (const sk of sSources) {
      const sLbs = remainingS / prods[sk].s
      const sCost = sLbs * costPerLb(sk)
      const nFromS = sLbs * prods[sk].n
      const remN = Math.max(0, remainingN - nFromS)
      const totalCost = sCost + remN * cheapestNcost
      if (totalCost < bestCost) { bestCost = totalCost; bestKey = sk }
    }
    if (bestKey) {
      lbs[bestKey] = (lbs[bestKey] || 0) + remainingS / prods[bestKey].s
      remainingN = Math.max(0, remainingN - (remainingS / prods[bestKey].s) * prods[bestKey].n)
    }
  }

  // Remaining nitrogen
  if (remainingN > 0) {
    const nSources = keys.filter(k => sel[k] && prods[k].n > 0 && (prods[k].p === 0))
    if (allowExcess) {
      // Find cheapest $/lb N
      let bestCost = Infinity, bestKey = null
      nSources.forEach(k => {
        const c = costPerLb(k) / prods[k].n
        if (c < bestCost) { bestCost = c; bestKey = k }
      })
      if (bestKey) lbs[bestKey] = (lbs[bestKey] || 0) + remainingN / prods[bestKey].n
    } else {
      // Only use pure N sources (no S contamination if already met)
      const pureN = nSources.filter(k => prods[k].s === 0)
      const source = pureN.length > 0 ? pureN : nSources
      let bestCost = Infinity, bestKey = null
      source.forEach(k => {
        const c = costPerLb(k) / prods[k].n
        if (c < bestCost) { bestCost = c; bestKey = k }
      })
      if (bestKey) lbs[bestKey] = (lbs[bestKey] || 0) + remainingN / prods[bestKey].n
    }
  }

  // Set rate values — for liquid mode, convert lbs to gallons
  keys.forEach(k => {
    const rateVal = mode === 'liquid' ? lbs[k] / prods[k].lbsPerGal : lbs[k]
    $(rateId(k)).value = rateVal.toFixed(2)
  })

  $('optimizationNote').classList.remove('hidden')
  $('optimizationWarning').classList.add('hidden')
  calculateAll()
}

// ── Calculate ──────────────────────────────────────────────────────────────
function calculateAll() {
  const prods = products()
  const keys = productKeys()
  const acres = val('acres') || 1
  const numBatches = parseInt($('numBatches').value) || 1
  const isLiquid = mode === 'liquid'

  // Get rates (lbs/acre for dry, gal/acre for liquid)
  const rawRates = {}
  keys.forEach(k => rawRates[k] = val(rateId(k)))

  // Convert to lbs/acre for nutrient calculations
  const lbsPerAcre = {}
  keys.forEach(k => {
    lbsPerAcre[k] = isLiquid ? rawRates[k] * prods[k].lbsPerGal : rawRates[k]
  })

  // Costs per acre
  const costs = {}
  let totalCostPerAcre = 0
  keys.forEach(k => {
    costs[k] = lbsPerAcre[k] * costPerLb(k)
    totalCostPerAcre += costs[k]
  })

  // Nutrients delivered (lbs/acre)
  let totalN = 0, totalP = 0, totalK = 0, totalS = 0
  keys.forEach(k => {
    totalN += lbsPerAcre[k] * prods[k].n
    totalP += lbsPerAcre[k] * prods[k].p
    totalK += lbsPerAcre[k] * prods[k].k
    totalS += lbsPerAcre[k] * prods[k].s
  })

  const totalFieldCost = totalCostPerAcre * acres

  // Total product for field
  let totalProduct, perBatch, productUnit
  if (isLiquid) {
    const totalGal = keys.reduce((a, k) => a + rawRates[k], 0) * acres
    totalProduct = totalGal
    perBatch = numBatches > 0 ? totalGal / numBatches : 0
    productUnit = 'gal'
  } else {
    const totalLbs = keys.reduce((a, k) => a + lbsPerAcre[k], 0) * acres
    totalProduct = totalLbs
    perBatch = numBatches > 0 ? totalLbs / numBatches : 0
    productUnit = 'lbs'
  }

  $('totalProductNeeded').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + productUnit
  $('productPerBatch').textContent = perBatch.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + productUnit

  $('costPerAcreBig').textContent = '$' + totalCostPerAcre.toFixed(2)
  $('totalFieldCostSmall').textContent = '$' + totalFieldCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' total field cost'
  $('totalLbs').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + productUnit + ' total'

  $('nDelivered').textContent = totalN.toFixed(1)
  $('pDelivered').textContent = totalP.toFixed(1)
  $('kDelivered').textContent = totalK.toFixed(1)
  $('sDelivered').textContent = totalS.toFixed(1)

  // Breakdown table
  const rateLabel = isLiquid ? 'gal/acre' : 'lbs/acre'
  $('breakdownBody').innerHTML = keys.map(k => {
    const p = prods[k]
    return `
      <tr class="hover:bg-zinc-800/30 transition-colors">
        <td class="px-3 py-2.5 font-medium flex items-center gap-2">
          <span class="w-3 h-3 rounded-full inline-block shrink-0" style="background:${p.color}"></span>
          ${p.name}
        </td>
        <td class="px-3 py-2.5 text-right">${rawRates[k].toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right">$${costs[k].toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.n).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.p).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.k).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.s).toFixed(1)}</td>
      </tr>`
  }).join('')

  // Cost per lb nutrient (with N credit)
  // Find primary N cost
  const nKeys = keys.filter(k => prods[k].n > 0 && prods[k].p === 0 && prods[k].s === 0 && lbsPerAcre[k] > 0)
  const primaryNcpl = nKeys.length > 0 ? costPerLb(nKeys[0]) / prods[nKeys[0]].n : (
    keys.filter(k => prods[k].n > 0 && lbsPerAcre[k] > 0).length > 0
      ? costPerLb(keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0)) / prods[keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0)].n
      : 0
  )

  let unitN = '—', unitP = '—', unitK = '—', unitS = '—'

  // N cost
  if (nKeys.length > 0) unitN = '$' + primaryNcpl.toFixed(3)
  else { const nk = keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0); if (nk) unitN = '$' + (costPerLb(nk) / prods[nk].n).toFixed(3) }

  // P cost (with N credit)
  const pk = keys.find(k => prods[k].p > 0 && lbsPerAcre[k] > 0)
  if (pk) {
    const nCredit = prods[pk].n * 2000 * primaryNcpl
    const effPrice = Math.max(0, getPrice(pk) - nCredit)
    unitP = '$' + (effPrice / 2000 / prods[pk].p).toFixed(3)
  }

  // K cost
  const kk = keys.find(k => prods[k].k > 0 && lbsPerAcre[k] > 0)
  if (kk) {
    const nCredit = prods[kk].n * 2000 * primaryNcpl
    const sCredit = 0 // could add S credit too
    const effPrice = Math.max(0, getPrice(kk) - nCredit)
    unitK = '$' + (effPrice / 2000 / prods[kk].k).toFixed(3)
  }

  // S cost (with N credit)
  const sk = keys.find(k => prods[k].s > 0 && lbsPerAcre[k] > 0)
  if (sk) {
    const nCredit = prods[sk].n * 2000 * primaryNcpl
    const effPrice = Math.max(0, getPrice(sk) - nCredit)
    unitS = '$' + (effPrice / 2000 / prods[sk].s).toFixed(3)
  }

  $('costPerLbN').textContent = unitN
  $('costPerLbP').textContent = unitP
  $('costPerLbK').textContent = unitK
  $('costPerLbS').textContent = unitS
}

// ── Mode Switch ────────────────────────────────────────────────────────────
function setMode(newMode) {
  mode = newMode
  $('btnModeDry').classList.toggle('mode-btn-active', mode === 'dry')
  $('btnModeLiquid').classList.toggle('mode-btn-active', mode === 'liquid')

  const subtitle = mode === 'dry'
    ? Object.values(DRY_PRODUCTS).map(p => p.name).join(' · ')
    : Object.values(LIQUID_PRODUCTS).map(p => p.name).join(' · ')
  $('appSubtitle').textContent = subtitle

  renderProducts()
  renderRates()
  optimizeBlend()
}

// ── Storage ────────────────────────────────────────────────────────────────
function savePrices() {
  const prices = {}
  productKeys().forEach(k => prices[k] = $(`price_${k}`).value)
  localStorage.setItem(`dfc_${mode}_prices`, JSON.stringify(prices))
}

function saveBlend() {
  const name = $('blendName').value.trim()
  if (!name) { toast('Enter a blend name first', 'error'); return }

  const rates = {}
  productKeys().forEach(k => rates[k] = $(rateId(k)).value)
  const prices = {}
  productKeys().forEach(k => prices[k] = $(`price_${k}`).value)
  const selected = getSelected()

  const data = {
    mode,
    prices, selected, rates,
    acres: $('acres').value,
    numBatches: $('numBatches').value,
    cartRental: checked('cartRental'),
    customerName: $('customerName').value,
    targets: { n: $('targetN').value, p: $('targetP').value, k: $('targetK').value, s: $('targetS').value },
    allowExcess: checked('allowExcess'),
    notes: $('notes').value,
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
    const b = blends[name]
    if (b.mode) opt.textContent += ` (${b.mode})`
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

  // Switch mode if needed
  if (d.mode && d.mode !== mode) setMode(d.mode)

  // Set prices
  const keys = productKeys()
  if (d.prices) keys.forEach(k => { if ($(`price_${k}`) && d.prices[k] != null) $(`price_${k}`).value = d.prices[k] })
  if (d.selected) keys.forEach(k => { if ($(`use_${k}`) && d.selected[k] != null) $(`use_${k}`).checked = d.selected[k] })

  $('acres').value = d.acres || 120
  $('numBatches').value = d.numBatches || 1
  $('cartRental').checked = d.cartRental || false
  $('customerName').value = d.customerName || ''
  $('targetN').value = d.targets?.n || 0
  $('targetP').value = d.targets?.p || 0
  $('targetK').value = d.targets?.k || 0
  $('targetS').value = d.targets?.s || 0
  $('allowExcess').checked = d.allowExcess !== false
  $('notes').value = d.notes || ''
  $('blendName').value = name

  if (d.rates) keys.forEach(k => { if ($(rateId(k)) && d.rates[k] != null) $(rateId(k)).value = d.rates[k] })

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
  $('blendName').value = ''; $('customerName').value = ''; $('notes').value = ''
  $('cartRental').checked = false; $('acres').value = 120; $('numBatches').value = 1
  $('targetN').value = 40; $('targetP').value = 40; $('targetK').value = 40; $('targetS').value = 20
  $('allowExcess').checked = true; $('autoOptimize').checked = true
  $('optimizationNote').classList.add('hidden')
  renderProducts()
  renderRates()
  optimizeBlend()
  toast('Reset to defaults', 'info')
}

// ── PDF: Quote ─────────────────────────────────────────────────────────────
function printQuote() {
  const notes = $('notes').value || 'No notes provided'
  const customer = $('customerName').value || 'N/A'
  const blendName = $('blendName').value || 'Unnamed Blend'
  const cartRental = checked('cartRental') ? '✓ Cart Rental' : ''
  const prods = products(); const keys = productKeys()
  const isLiquid = mode === 'liquid'
  const rateUnit = isLiquid ? 'gal/acre' : 'lbs/acre'
  const modeLabel = isLiquid ? 'Liquid' : 'Dry'

  const productRows = keys.map(k => {
    const p = prods[k]; const rate = val(rateId(k))
    const lbs = isLiquid ? rate * p.lbsPerGal : rate
    const cost = lbs * costPerLb(k)
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #ddd;">${p.name} ${p.analysis}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${rate.toFixed(2)} ${rateUnit}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">$${cost.toFixed(2)}</td>
    </tr>`
  }).join('')

  const html = `
    <div style="padding:40px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
        <div>
          <h1 style="color:#059669;font-size:26px;margin:0;">${modeLabel} Fertilizer Quote</h1>
          <p style="color:#666;margin:4px 0 0;">${new Date().toLocaleDateString()} · H²AG Optimizer</p>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Customer:</strong> ${customer}</div>
          <div><strong>Blend:</strong> ${blendName}</div>
          <div><strong>Mode:</strong> ${modeLabel}</div>
          ${cartRental ? `<div style="color:#d97706;">${cartRental}</div>` : ''}
        </div>
      </div>
      <hr style="border-color:#ddd;margin-bottom:24px;">
      <h2 style="font-size:16px;color:#333;margin:0 0 8px;">Notes</h2>
      <p style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">${notes}</p>
      <h2 style="font-size:16px;color:#333;margin:20px 0 8px;">Target Nutrients (lbs/acre)</h2>
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
      <h2 style="font-size:16px;color:#333;margin:20px 0 8px;">Recommended Rates</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr style="background:#f5f5f5;">
          <th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Cost/acre</th>
        </tr>
        ${productRows}
      </table>
      <div style="background:#ecfdf5;padding:20px;border-radius:12px;margin:20px 0;display:flex;justify-content:space-between;">
        <div>
          <div style="color:#065f46;font-size:13px;text-transform:uppercase;">Price Per Acre</div>
          <div style="font-size:40px;font-weight:bold;">${$('costPerAcreBig').textContent}</div>
          <div style="color:#065f46;">${$('totalFieldCostSmall').textContent}</div>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Acres:</strong> ${$('acres').value}</div>
          <div><strong>Total:</strong> ${$('totalLbs').textContent}</div>
          <div><strong>N:</strong> ${$('nDelivered').textContent} lbs/acre</div>
          <div><strong>P₂O₅:</strong> ${$('pDelivered').textContent} lbs/acre</div>
          <div><strong>K₂O:</strong> ${$('kDelivered').textContent} lbs/acre</div>
          <div><strong>S:</strong> ${$('sDelivered').textContent} lbs/acre</div>
        </div>
      </div>
      <p style="font-size:11px;color:#999;text-align:center;margin-top:32px;">
        © 2026 H²AG · Fertilizer Optimizer v2.0 · Generated ${new Date().toLocaleString()}
      </p>
    </div>`

  html2pdf().set({
    margin: 0, filename: `quote-${blendName.replace(/\s+/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  }).from(html).save()
}

// ── PDF: Blend Sheet ───────────────────────────────────────────────────────
function printBlendSheet() {
  const customer = $('customerName').value
  if (!customer) { toast('Enter a customer name first', 'error'); return }

  const blendName = $('blendName').value || 'Unnamed Blend'
  const acres = val('acres'); const numBatches = parseInt($('numBatches').value) || 1
  const notes = $('notes').value || ''
  const cartRental = checked('cartRental')
  const prods = products(); const keys = productKeys()
  const isLiquid = mode === 'liquid'
  const rateUnit = isLiquid ? 'gal/acre' : 'lbs/acre'
  const batchUnit = isLiquid ? 'gal' : 'lbs'
  const modeLabel = isLiquid ? 'Liquid' : 'Dry'

  const batchRows = keys.map(k => {
    const p = prods[k]; const rate = val(rateId(k))
    if (rate === 0) return null
    const lbs = isLiquid ? rate * p.lbsPerGal : rate
    const totalField = rate * acres
    const perBatch = totalField / numBatches
    const tons = (isLiquid ? totalField * p.lbsPerGal : totalField) / 2000
    return { key: k, label: `${p.name} ${p.analysis}`, color: p.color, rate, lbs, totalField, perBatch, tons }
  }).filter(Boolean)

  let cumulative = 0
  const tableRows = batchRows.map(r => {
    cumulative += r.perBatch
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:500;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:6px;"></span>
        ${r.label}
      </td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.rate.toFixed(2)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${r.perBatch.toFixed(isLiquid ? 1 : 0)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#f0fdf4;font-weight:bold;">${cumulative.toFixed(isLiquid ? 1 : 0)}</td>
      <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.tons.toFixed(2)}</td>
    </tr>`
  }).join('')

  const checklistRows = Array.from({ length: numBatches }, (_, i) =>
    `<tr><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${i + 1}</td><td style="padding:6px 12px;border:1px solid #ddd;width:120px;"></td><td style="padding:6px 12px;border:1px solid #ddd;width:80px;"></td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;font-size:18px;">☐</td></tr>`
  ).join('')

  const totalPerBatch = batchRows.reduce((a, r) => a + r.perBatch, 0)

  const html = `
    <div style="padding:36px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div>
          <h1 style="font-size:24px;margin:0;color:#d97706;">${modeLabel} Blend Sheet</h1>
          <p style="margin:4px 0 0;color:#666;">${new Date().toLocaleDateString()} · H²AG</p>
        </div>
        <div style="text-align:right;font-size:14px;color:#333;">
          <div><strong>Customer:</strong> ${customer}</div>
          <div><strong>Blend:</strong> ${blendName}</div>
          <div><strong>Acres:</strong> ${acres} · <strong>Batches:</strong> ${numBatches}</div>
          ${cartRental ? '<div style="color:#d97706;font-weight:bold;">CART RENTAL</div>' : ''}
        </div>
      </div>
      <hr style="border-color:#ddd;margin-bottom:20px;">
      ${notes ? `<p style="background:#fffbeb;border:1px solid #fde68a;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:20px;white-space:pre-wrap;">${notes}</p>` : ''}
      <h2 style="font-size:15px;margin:0 0 8px;">Loading Sequence (per batch of ${totalPerBatch.toFixed(isLiquid ? 1 : 0)} ${batchUnit})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr style="background:#fef3c7;">
          <th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${batchUnit}/batch</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;background:#f0fdf4;">Cumulative</th>
          <th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Total Tons</th>
        </tr>
        ${tableRows}
      </table>
      <h2 style="font-size:15px;margin:0 0 8px;">Batch Completion Log</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <tr style="background:#f5f5f5;">
          <th style="padding:6px 12px;border:1px solid #ddd;">Batch #</th>
          <th style="padding:6px 12px;border:1px solid #ddd;">Date / Time</th>
          <th style="padding:6px 12px;border:1px solid #ddd;">Initials</th>
          <th style="padding:6px 12px;border:1px solid #ddd;">Done</th>
        </tr>
        ${checklistRows}
      </table>
      <div style="border:1px solid #ddd;padding:16px;border-radius:8px;font-size:13px;">
        <div style="display:flex;gap:40px;flex-wrap:wrap;">
          <div><strong>Delivered</strong><br/>N: ${$('nDelivered').textContent} · P₂O₅: ${$('pDelivered').textContent} · K₂O: ${$('kDelivered').textContent} · S: ${$('sDelivered').textContent} lbs/acre</div>
          <div><strong>Cost</strong><br/>Per Acre: ${$('costPerAcreBig').textContent} · Total: ${$('totalFieldCostSmall').textContent.replace(' total field cost','')}</div>
        </div>
      </div>
      <p style="font-size:11px;color:#999;text-align:center;margin-top:28px;">© 2026 H²AG · Fertilizer Optimizer v2.0</p>
    </div>`

  html2pdf().set({
    margin: 0, filename: `blend-sheet-${blendName.replace(/\s+/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
  }).from(html).save()
}

// ── UI Wiring ──────────────────────────────────────────────────────────────
function initUI() {
  // Theme toggle
  $('btnTheme').addEventListener('click', toggleTheme)
  $('btnThemeMob').addEventListener('click', toggleTheme)

  // Mode toggle
  $('btnModeDry').addEventListener('click', () => setMode('dry'))
  $('btnModeLiquid').addEventListener('click', () => setMode('liquid'))

  // Save/Quote/Blend/Reset
  $('btnSaveHeader').addEventListener('click', saveBlend)
  $('btnSaveMob').addEventListener('click', saveBlend)
  $('btnQuote').addEventListener('click', printQuote)
  $('btnBlend').addEventListener('click', printBlendSheet)
  $('btnQuoteMob').addEventListener('click', printQuote)
  $('btnBlendMob').addEventListener('click', printBlendSheet)
  $('btnReset').addEventListener('click', resetAll)
  $('btnResetMob').addEventListener('click', resetAll)
  $('btnLoad').addEventListener('click', loadBlend)
  $('btnDelete').addEventListener('click', deleteBlend)
  $('btnOptimize').addEventListener('click', optimizeBlend)

  // Mobile menu
  $('btnMenuToggle').addEventListener('click', () => {
    const m = $('mobileMenu'); m.classList.toggle('hidden'); m.classList.toggle('flex')
  })

  // Sidebar collapse
  $('sidebarToggle').addEventListener('click', () => {
    const c = $('sidebarContent'); c.classList.toggle('hidden')
    $('sidebarArrow').textContent = c.classList.contains('hidden') ? '▼' : '▲'
  })

  // Auto-optimize on target change
  ;['targetN','targetP','targetK','targetS'].forEach(id => {
    $(id).addEventListener('input', () => { if (checked('autoOptimize')) optimizeBlend() })
  })

  // Recalculate on field changes
  ;['acres','numBatches'].forEach(id => $(id).addEventListener('input', calculateAll))
  $('allowExcess').addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
}

// ── Init ───────────────────────────────────────────────────────────────────
applyTheme()
renderProducts()
renderRates()
loadSavedList()
initUI()
optimizeBlend()
