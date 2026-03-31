import './style.css'
import { getSession, getProfile, signOut, supabase, listBlends, saveBlendToDB, deleteBlendFromDB } from './supabase.js'
import { route, navigate, startRouter } from './router.js'
import { renderLogin } from './pages/login.js'
import { renderAdmin } from './pages/admin.js'
import { toast, applyTheme, toggleTheme } from './ui.js'

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
let mode = 'dry'
let currentProfile = null
let currentCompany = null

function products() { return mode === 'dry' ? DRY_PRODUCTS : LIQUID_PRODUCTS }
function productKeys() { return Object.keys(products()) }
const $ = id => document.getElementById(id)
const val = id => parseFloat($(id)?.value) || 0
const checked = id => $(id)?.checked || false
function costPerLb(key) { return (parseFloat($(`price_${key}`)?.value) || 0) / 2000 }

// ── Auth Guard ─────────────────────────────────────────────────────────────
async function requireAuth() {
  const session = await getSession()
  if (!session) { navigate('/login'); return null }
  try {
    currentProfile = await getProfile(session.user.id)
    currentCompany = currentProfile.companies || null
  } catch {
    currentProfile = { role: 'user', full_name: session.user.email }
    currentCompany = null
  }
  return session
}

// ── Render Calculator App ──────────────────────────────────────────────────
function renderApp() {
  const companyName = currentCompany?.name || 'FertCalc Pro'
  const companyLogo = currentCompany?.logo_url || null
  const isAdmin = currentProfile?.role === 'super_admin'

  document.getElementById('app').innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Header -->
      <header class="flex items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-3 min-w-0">
          ${companyLogo ? `<img src="${companyLogo}" alt="" class="h-10 sm:h-12 w-auto" />` : '<div class="text-3xl">🌾</div>'}
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold leading-tight">${companyName}</h1>
            <p id="appSubtitle" class="text-xs text-zinc-500 mt-0.5">Fertilizer Optimizer</p>
          </div>
        </div>
        <div class="hidden sm:flex flex-wrap gap-2 items-center shrink-0">
          <button class="theme-toggle" title="Toggle theme">☀️</button>
          <button id="btnSaveHeader" class="btn-blue">💾 Save</button>
          <button id="btnQuote" class="btn-green">📄 Quote</button>
          <button id="btnBlend" class="btn-amber">📦 Blend Sheet</button>
          ${isAdmin ? '<button id="btnAdmin" class="btn-ghost">🛠️ Admin</button>' : ''}
          <button id="btnLogoutApp" class="btn-ghost">Sign Out</button>
        </div>
        <div class="flex sm:hidden gap-2 shrink-0">
          <button id="btnQuoteMob" class="btn-green px-3 py-2">📄</button>
          <button id="btnBlendMob" class="btn-amber px-3 py-2">📦</button>
          <button id="btnMenuToggle" class="btn-ghost px-3 py-2">⋯</button>
        </div>
      </header>

      <!-- Mobile menu -->
      <div id="mobileMenu" class="hidden card p-3 mb-4 flex-col gap-2">
        <button class="btn-ghost w-full justify-center theme-toggle">☀️ Toggle Theme</button>
        <button id="btnSaveMob" class="btn-blue w-full justify-center">💾 Save Blend</button>
        ${isAdmin ? '<button id="btnAdminMob" class="btn-ghost w-full justify-center">🛠️ Admin</button>' : ''}
        <button id="btnResetMob" class="btn-ghost w-full justify-center">↺ Reset All</button>
        <button id="btnLogoutMob" class="btn-ghost w-full justify-center">Sign Out</button>
      </div>

      <!-- Mode Toggle + Blend Bar -->
      <div class="card p-4 mb-5">
        <div class="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
          <span class="text-xs text-zinc-500 uppercase tracking-wide font-semibold mr-1">Mode:</span>
          <button id="btnModeDry" class="mode-btn mode-btn-active">🌾 Dry</button>
          <button id="btnModeLiquid" class="mode-btn">💧 Liquid</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label class="lbl">Blend Name</label>
            <input id="blendName" type="text" placeholder="e.g. Corn 180-60-30" class="inp" />
          </div>
          <div>
            <label class="lbl">Customer Name <span class="text-red-400 normal-case font-normal">*</span></label>
            <input id="customerName" type="text" placeholder="Customer name" class="inp" />
          </div>
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <label class="lbl">Load Saved Blend</label>
              <select id="savedBlends" class="inp text-sm py-2.5">
                <option value="">-- Select blend --</option>
              </select>
            </div>
            <div class="flex gap-1">
              <button id="btnLoad" class="btn-green text-xs px-3 py-2.5">Load</button>
              <button id="btnDelete" class="btn-red text-xs px-3 py-2.5">Del</button>
            </div>
          </div>
          <div class="flex items-center gap-3 pb-1">
            <input type="checkbox" id="cartRental" class="w-5 h-5 accent-amber-500 shrink-0" />
            <label for="cartRental" class="text-amber-400 font-medium text-sm cursor-pointer">Cart Rental</label>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Sidebar -->
        <aside class="lg:col-span-3 space-y-3">
          <button id="sidebarToggle" class="lg:hidden btn-ghost w-full justify-between text-sm py-3">
            <span>⚙️ Products &amp; Field Info</span>
            <span id="sidebarArrow" class="text-xs">▼</span>
          </button>
          <div id="sidebarContent" class="space-y-3 hidden lg:block">
            <div class="card p-4">
              <h2 class="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wide text-zinc-400">
                💰 Products &amp; Prices
                <span id="priceUnitBadge" class="bg-amber-900/60 text-amber-400 px-2 py-0.5 rounded-full text-xs">$/TON</span>
              </h2>
              <div id="productsContainer" class="space-y-3"></div>
            </div>
            <div class="card p-4">
              <h2 class="text-xs font-semibold mb-3 uppercase tracking-wide text-zinc-400">📍 Field Information</h2>
              <div class="space-y-4">
                <div>
                  <label class="lbl">Acres</label>
                  <input id="acres" type="number" value="120" min="1"
                    class="w-full text-4xl font-bold bg-transparent focus:outline-none py-1 border-b-2 border-zinc-700 focus:border-zinc-400 transition-colors" />
                </div>
                <div>
                  <label class="lbl">Number of Batches</label>
                  <input id="numBatches" type="number" value="1" min="1"
                    class="w-full text-4xl font-bold bg-transparent focus:outline-none py-1 border-b-2 border-zinc-700 focus:border-zinc-400 transition-colors" />
                </div>
                <div class="pt-2 border-t border-zinc-800 space-y-2">
                  <div class="flex justify-between items-baseline">
                    <span class="text-xs text-zinc-500">Total Product</span>
                    <span id="totalProductNeeded" class="font-semibold text-emerald-400 text-sm">0 lbs</span>
                  </div>
                  <div class="flex justify-between items-baseline">
                    <span class="text-xs text-zinc-500">Per Batch</span>
                    <span id="productPerBatch" class="font-semibold text-amber-400 text-sm">0 lbs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main -->
        <main class="lg:col-span-9 space-y-4">
          <!-- Targets -->
          <div class="card p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-zinc-400">🎯 Target Nutrients (lbs/acre)</h2>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" id="autoOptimize" checked class="w-4 h-4 accent-emerald-500" />
                  <span class="font-medium">Auto-Optimize</span>
                </label>
                <button id="btnOptimize" class="btn-green text-xs px-4 py-2">⚡ Optimize</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label class="lbl" style="color:#60a5fa">Nitrogen (N)</label><input id="targetN" type="number" step="1" value="40" class="inp-xl" /></div>
              <div><label class="lbl" style="color:#fb923c">Phosphate (P₂O₅)</label><input id="targetP" type="number" step="1" value="40" class="inp-xl" /></div>
              <div><label class="lbl" style="color:#a78bfa">Potash (K₂O)</label><input id="targetK" type="number" step="1" value="40" class="inp-xl" /></div>
              <div><label class="lbl" style="color:#34d399">Sulfur (S)</label><input id="targetS" type="number" step="1" value="20" class="inp-xl" /></div>
            </div>
            <div class="mt-3 flex items-start gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3">
              <input type="checkbox" id="allowExcess" checked class="w-4 h-4 accent-emerald-500 mt-0.5 shrink-0" />
              <div>
                <label for="allowExcess" class="font-medium text-emerald-400 text-sm cursor-pointer">Allow excess nutrients</label>
                <p class="text-xs text-zinc-500 mt-0.5">Allow multi-nutrient products even if they oversupply another nutrient</p>
              </div>
            </div>
            <div id="optimizationWarning" class="hidden mt-3 text-amber-400 text-sm flex items-center gap-2">
              <span>⚠️</span><span id="warningText"></span>
            </div>
          </div>

          <!-- Rates & Results -->
          <div class="card p-4">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-4 flex items-center justify-between">
              <span>🚜 Rates (<span id="rateUnitLabel">lbs/acre</span>)</span>
              <span id="optimizationNote" class="hidden text-xs bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded-full normal-case">✅ Optimized</span>
            </h2>
            <div id="ratesContainer" class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3"></div>

            <!-- Cost Hero -->
            <div class="mt-4 bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <div class="text-emerald-200 text-xs tracking-widest uppercase">Price Per Acre</div>
                <div id="costPerAcreBig" class="text-5xl sm:text-6xl font-bold mt-0.5 leading-none">$0.00</div>
                <div id="totalFieldCostSmall" class="text-emerald-200 text-sm mt-1.5">$0 total field cost</div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-4xl sm:text-5xl">💵</div>
                <div id="totalLbs" class="text-emerald-200 text-xs mt-1.5">0 lbs total</div>
              </div>
            </div>

            <!-- Delivered -->
            <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div id="nDelivered" class="text-3xl sm:text-4xl font-bold text-blue-400">0.0</div><div class="text-xs text-zinc-500 mt-1">N lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div id="pDelivered" class="text-3xl sm:text-4xl font-bold text-orange-400">0.0</div><div class="text-xs text-zinc-500 mt-1">P₂O₅ lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div id="kDelivered" class="text-3xl sm:text-4xl font-bold text-violet-400">0.0</div><div class="text-xs text-zinc-500 mt-1">K₂O lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div id="sDelivered" class="text-3xl sm:text-4xl font-bold text-emerald-400">0.0</div><div class="text-xs text-zinc-500 mt-1">S lbs/acre</div></div>
            </div>

            <!-- Breakdown Table -->
            <div class="mt-4">
              <h3 class="lbl mb-2">Detailed Breakdown Per Acre</h3>
              <div class="overflow-x-auto rounded-xl border border-zinc-800">
                <table class="w-full text-sm min-w-[520px]">
                  <thead><tr class="border-b border-zinc-700 bg-zinc-800/50 text-zinc-400">
                    <th class="text-left px-3 py-2.5 font-medium">Product</th>
                    <th id="thRate" class="text-right px-3 py-2.5 font-medium">lbs/acre</th>
                    <th class="text-right px-3 py-2.5 font-medium">Cost/acre</th>
                    <th class="text-right px-3 py-2.5 font-medium">N</th>
                    <th class="text-right px-3 py-2.5 font-medium">P₂O₅</th>
                    <th class="text-right px-3 py-2.5 font-medium">K₂O</th>
                    <th class="text-right px-3 py-2.5 font-medium">S</th>
                  </tr></thead>
                  <tbody id="breakdownBody" class="text-zinc-300 divide-y divide-zinc-800"></tbody>
                </table>
              </div>
            </div>

            <!-- Cost per lb -->
            <div class="mt-4 bg-zinc-800/40 border border-zinc-700 rounded-2xl p-4">
              <h3 class="lbl mb-3">Cost Per Pound of Nutrient <span class="text-emerald-400 normal-case text-xs font-normal ml-1">(effective after N credit)</span></h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div><div class="text-xs text-zinc-500">Nitrogen</div><div id="costPerLbN" class="text-2xl sm:text-3xl font-bold text-blue-400 mt-1">—</div><div class="text-xs text-zinc-600">per lb N</div></div>
                <div><div class="text-xs text-zinc-500">Phosphate</div><div id="costPerLbP" class="text-2xl sm:text-3xl font-bold text-orange-400 mt-1">—</div><div class="text-xs text-zinc-600">per lb P₂O₅</div></div>
                <div><div class="text-xs text-zinc-500">Potash</div><div id="costPerLbK" class="text-2xl sm:text-3xl font-bold text-violet-400 mt-1">—</div><div class="text-xs text-zinc-600">per lb K₂O</div></div>
                <div><div class="text-xs text-zinc-500">Sulfur</div><div id="costPerLbS" class="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">—</div><div class="text-xs text-zinc-600">per lb S</div></div>
              </div>
            </div>

            <!-- Notes -->
            <div class="mt-4">
              <label class="lbl mb-1.5">Notes / Customer / Field Info</label>
              <textarea id="notes" rows="3" class="inp resize-y rounded-xl" placeholder="Customer name, field number, crop, special instructions..."></textarea>
            </div>

            <div class="mt-5 text-center text-xs text-zinc-600 pb-1">
              ${companyLogo ? `<img src="${companyLogo}" alt="" class="h-4 w-auto opacity-40 inline-block mr-1" />` : ''}
              © 2026 ${companyName} · Powered by FertCalc Pro
            </div>
          </div>
        </main>
      </div>
    </div>`

  applyTheme()
  renderProducts()
  renderRates()
  loadSavedList()
  wireAppEvents()
  optimizeBlend()
}

// ── Render Products ────────────────────────────────────────────────────────
function renderProducts() {
  const prods = products()
  const container = $('productsContainer')
  if (!container) return
  container.innerHTML = productKeys().map(key => {
    const p = prods[key]
    const savedPrices = JSON.parse(localStorage.getItem(`dfc_${mode}_prices`) || '{}')
    const companyPrices = currentCompany?.default_prices || {}
    const priceVal = savedPrices[key] || companyPrices[key] || p.defaultPrice
    return `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <input type="checkbox" id="use_${key}" checked class="w-4 h-4 shrink-0" style="accent-color:${p.color}" />
          <div class="badge" style="background:${p.color}">${p.abbr}</div>
          <div>
            <div class="font-medium text-sm">${p.name}</div>
            <div class="text-xs text-zinc-500">${p.analysis}${p.lbsPerGal ? ` · ${p.lbsPerGal} lb/gal` : ''}</div>
          </div>
        </div>
        <input id="price_${key}" type="number" step="1" value="${priceVal}"
          class="w-20 text-right inp py-1.5 rounded-xl text-sm font-semibold" />
      </div>`
  }).join('')

  $('priceUnitBadge').textContent = '$/TON'

  for (const k of productKeys()) {
    $(`price_${k}`)?.addEventListener('input', calculateAll)
    $(`price_${k}`)?.addEventListener('change', savePrices)
    $(`use_${k}`)?.addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
  }
}

function renderRates() {
  const prods = products()
  const unit = mode === 'dry' ? 'lbs/acre' : 'gal/acre'
  if ($('rateUnitLabel')) $('rateUnitLabel').textContent = unit
  if ($('thRate')) $('thRate').textContent = unit

  const container = $('ratesContainer')
  if (!container) return
  container.innerHTML = productKeys().map(key => {
    const p = prods[key]
    return `
      <div>
        <div class="flex items-center gap-1 mb-1.5">
          <div class="w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:${p.color}">${p.abbr.substring(0,2)}</div>
          <span class="text-xs font-medium truncate">${p.name}</span>
        </div>
        <input id="rate_${key}" type="number" step="0.01" value="0" readonly class="inp-xl-ro" />
        <div class="text-center text-xs text-zinc-600 mt-1">${unit}</div>
      </div>`
  }).join('')
}

// ── Optimize ───────────────────────────────────────────────────────────────
function optimizeBlend() {
  const targetN = val('targetN'), targetP = val('targetP'), targetK = val('targetK'), targetS = val('targetS')
  const allowExcess = checked('allowExcess')
  const sel = {}
  const prods = products(); const keys = productKeys()
  keys.forEach(k => sel[k] = checked(`use_${k}`))

  const lbs = {}; keys.forEach(k => lbs[k] = 0)

  const pKey = keys.find(k => sel[k] && prods[k].p > 0)
  if (targetP > 0 && pKey) lbs[pKey] = targetP / prods[pKey].p

  const kKey = keys.find(k => sel[k] && prods[k].k > 0 && prods[k].p === 0)
  if (targetK > 0 && kKey) lbs[kKey] = targetK / prods[kKey].k

  let coveredN = 0; keys.forEach(k => coveredN += lbs[k] * prods[k].n)
  let remainingN = Math.max(0, targetN - coveredN)
  let remainingS = targetS; keys.forEach(k => remainingS -= lbs[k] * prods[k].s)
  remainingS = Math.max(0, remainingS)

  if (remainingS > 0) {
    const sSources = keys.filter(k => sel[k] && prods[k].s > 0 && lbs[k] === 0)
    const nSources = keys.filter(k => sel[k] && prods[k].n > 0 && prods[k].p === 0 && prods[k].s === 0)
    const cheapN = nSources.length > 0 ? Math.min(...nSources.map(k => costPerLb(k) / prods[k].n)) : Infinity

    let bestCost = Infinity, bestKey = null
    for (const sk of sSources) {
      const sLbs = remainingS / prods[sk].s
      const sCost = sLbs * costPerLb(sk)
      const nFromS = sLbs * prods[sk].n
      const remN = Math.max(0, remainingN - nFromS)
      const total = sCost + remN * cheapN
      if (total < bestCost) { bestCost = total; bestKey = sk }
    }
    if (bestKey) {
      lbs[bestKey] += remainingS / prods[bestKey].s
      remainingN = Math.max(0, remainingN - (remainingS / prods[bestKey].s) * prods[bestKey].n)
    }
  }

  if (remainingN > 0) {
    const nSources = keys.filter(k => sel[k] && prods[k].n > 0 && prods[k].p === 0)
    const pool = allowExcess ? nSources : nSources.filter(k => prods[k].s === 0).length > 0 ? nSources.filter(k => prods[k].s === 0) : nSources
    let bestCost = Infinity, bestKey = null
    pool.forEach(k => { const c = costPerLb(k) / prods[k].n; if (c < bestCost) { bestCost = c; bestKey = k } })
    if (bestKey) lbs[bestKey] += remainingN / prods[bestKey].n
  }

  keys.forEach(k => {
    const v = mode === 'liquid' ? lbs[k] / prods[k].lbsPerGal : lbs[k]
    const el = $(`rate_${k}`); if (el) el.value = v.toFixed(2)
  })

  if ($('optimizationNote')) $('optimizationNote').classList.remove('hidden')
  if ($('optimizationWarning')) $('optimizationWarning').classList.add('hidden')
  calculateAll()
}

// ── Calculate ──────────────────────────────────────────────────────────────
function calculateAll() {
  const prods = products(); const keys = productKeys()
  const acres = val('acres') || 1; const numBatches = parseInt($('numBatches')?.value) || 1
  const isLiquid = mode === 'liquid'

  const rawRates = {}; keys.forEach(k => rawRates[k] = val(`rate_${k}`))
  const lbsPerAcre = {}
  keys.forEach(k => lbsPerAcre[k] = isLiquid ? rawRates[k] * prods[k].lbsPerGal : rawRates[k])

  const costs = {}; let totalCostPerAcre = 0
  keys.forEach(k => { costs[k] = lbsPerAcre[k] * costPerLb(k); totalCostPerAcre += costs[k] })

  let totalN = 0, totalP = 0, totalK = 0, totalS = 0
  keys.forEach(k => { totalN += lbsPerAcre[k] * prods[k].n; totalP += lbsPerAcre[k] * prods[k].p; totalK += lbsPerAcre[k] * prods[k].k; totalS += lbsPerAcre[k] * prods[k].s })

  const totalFieldCost = totalCostPerAcre * acres
  const pUnit = isLiquid ? 'gal' : 'lbs'
  const totalProduct = keys.reduce((a, k) => a + rawRates[k], 0) * acres
  const perBatch = numBatches > 0 ? totalProduct / numBatches : 0

  if ($('totalProductNeeded')) $('totalProductNeeded').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit
  if ($('productPerBatch')) $('productPerBatch').textContent = perBatch.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit
  if ($('costPerAcreBig')) $('costPerAcreBig').textContent = '$' + totalCostPerAcre.toFixed(2)
  if ($('totalFieldCostSmall')) $('totalFieldCostSmall').textContent = '$' + totalFieldCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' total field cost'
  if ($('totalLbs')) $('totalLbs').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit + ' total'
  if ($('nDelivered')) $('nDelivered').textContent = totalN.toFixed(1)
  if ($('pDelivered')) $('pDelivered').textContent = totalP.toFixed(1)
  if ($('kDelivered')) $('kDelivered').textContent = totalK.toFixed(1)
  if ($('sDelivered')) $('sDelivered').textContent = totalS.toFixed(1)

  // Breakdown table
  if ($('breakdownBody')) {
    $('breakdownBody').innerHTML = keys.map(k => {
      const p = prods[k]
      return `<tr class="hover:bg-zinc-800/30 transition-colors">
        <td class="px-3 py-2.5 font-medium flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block shrink-0" style="background:${p.color}"></span>${p.name}</td>
        <td class="px-3 py-2.5 text-right">${rawRates[k].toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right">$${costs[k].toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.n).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.p).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.k).toFixed(1)}</td>
        <td class="px-3 py-2.5 text-right">${(lbsPerAcre[k] * p.s).toFixed(1)}</td>
      </tr>`
    }).join('')
  }

  // Cost per lb
  const nKeys = keys.filter(k => prods[k].n > 0 && prods[k].p === 0 && prods[k].s === 0 && lbsPerAcre[k] > 0)
  const primaryNcpl = nKeys.length > 0 ? costPerLb(nKeys[0]) / prods[nKeys[0]].n : (keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0) ? costPerLb(keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0)) / prods[keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0)].n : 0)

  let unitN = '—', unitP = '—', unitK = '—', unitS = '—'
  if (nKeys.length > 0) unitN = '$' + primaryNcpl.toFixed(3)
  else { const nk = keys.find(k => prods[k].n > 0 && lbsPerAcre[k] > 0); if (nk) unitN = '$' + (costPerLb(nk) / prods[nk].n).toFixed(3) }

  const pk = keys.find(k => prods[k].p > 0 && lbsPerAcre[k] > 0)
  if (pk) { const nc = prods[pk].n * 2000 * primaryNcpl; unitP = '$' + (Math.max(0, (parseFloat($(`price_${pk}`)?.value) || 0) - nc) / 2000 / prods[pk].p).toFixed(3) }

  const kk = keys.find(k => prods[k].k > 0 && lbsPerAcre[k] > 0)
  if (kk) { const nc = prods[kk].n * 2000 * primaryNcpl; unitK = '$' + (Math.max(0, (parseFloat($(`price_${kk}`)?.value) || 0) - nc) / 2000 / prods[kk].k).toFixed(3) }

  const sk = keys.find(k => prods[k].s > 0 && lbsPerAcre[k] > 0)
  if (sk) { const nc = prods[sk].n * 2000 * primaryNcpl; unitS = '$' + (Math.max(0, (parseFloat($(`price_${sk}`)?.value) || 0) - nc) / 2000 / prods[sk].s).toFixed(3) }

  if ($('costPerLbN')) $('costPerLbN').textContent = unitN
  if ($('costPerLbP')) $('costPerLbP').textContent = unitP
  if ($('costPerLbK')) $('costPerLbK').textContent = unitK
  if ($('costPerLbS')) $('costPerLbS').textContent = unitS
}

// ── Mode Switch ────────────────────────────────────────────────────────────
function setMode(newMode) {
  mode = newMode
  $('btnModeDry')?.classList.toggle('mode-btn-active', mode === 'dry')
  $('btnModeLiquid')?.classList.toggle('mode-btn-active', mode === 'liquid')
  renderProducts(); renderRates(); optimizeBlend()
}

// ── Storage ────────────────────────────────────────────────────────────────
function savePrices() {
  const prices = {}; productKeys().forEach(k => prices[k] = $(`price_${k}`)?.value)
  localStorage.setItem(`dfc_${mode}_prices`, JSON.stringify(prices))
}

async function saveBlend() {
  const name = $('blendName')?.value.trim()
  if (!name) { toast('Enter a blend name first', 'error'); return }

  const rates = {}; productKeys().forEach(k => rates[k] = $(`rate_${k}`)?.value)
  const prices = {}; productKeys().forEach(k => prices[k] = $(`price_${k}`)?.value)
  const selected = {}; productKeys().forEach(k => selected[k] = checked(`use_${k}`))

  const blendData = {
    mode, prices, selected, rates,
    acres: $('acres')?.value, numBatches: $('numBatches')?.value,
    cartRental: checked('cartRental'), customerName: $('customerName')?.value,
    targets: { n: $('targetN')?.value, p: $('targetP')?.value, k: $('targetK')?.value, s: $('targetS')?.value },
    allowExcess: checked('allowExcess'), notes: $('notes')?.value,
  }

  // Save to cloud if company exists, otherwise localStorage
  if (currentCompany) {
    try {
      const session = await getSession()
      await saveBlendToDB({
        company_id: currentCompany.id,
        user_id: session.user.id,
        name, customer_name: $('customerName')?.value || '',
        mode, data: blendData,
      })
      toast(`"${name}" saved to cloud`, 'success')
      loadSavedList()
    } catch (err) { toast('Save failed: ' + err.message, 'error') }
  } else {
    const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
    blends[name] = blendData
    localStorage.setItem('dfc_blends', JSON.stringify(blends))
    loadSavedList()
    toast(`"${name}" saved locally`, 'success')
  }
}

async function loadSavedList() {
  const sel = $('savedBlends'); if (!sel) return
  sel.innerHTML = '<option value="">-- Select blend --</option>'

  if (currentCompany) {
    try {
      const blends = await listBlends(currentCompany.id)
      blends.forEach(b => {
        const opt = document.createElement('option')
        opt.value = b.id; opt.textContent = `${b.name} (${b.mode})`
        sel.appendChild(opt)
      })
    } catch { /* silently fail */ }
  } else {
    const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
    Object.keys(blends).forEach(name => {
      const opt = document.createElement('option')
      opt.value = name; opt.textContent = `${name} (${blends[name].mode || 'dry'})`
      sel.appendChild(opt)
    })
  }
}

async function loadBlend() {
  const selVal = $('savedBlends')?.value
  if (!selVal) { toast('Select a blend to load', 'error'); return }

  let d
  if (currentCompany) {
    try {
      const blends = await listBlends(currentCompany.id)
      const blend = blends.find(b => b.id === selVal)
      if (!blend) return
      d = blend.data; d._dbId = blend.id
      if ($('blendName')) $('blendName').value = blend.name
    } catch (err) { toast(err.message, 'error'); return }
  } else {
    const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
    d = blends[selVal]
    if (!d) return
    if ($('blendName')) $('blendName').value = selVal
  }

  if (d.mode && d.mode !== mode) setMode(d.mode)

  const keys = productKeys()
  if (d.prices) keys.forEach(k => { if ($(`price_${k}`) && d.prices[k] != null) $(`price_${k}`).value = d.prices[k] })
  if (d.selected) keys.forEach(k => { if ($(`use_${k}`) && d.selected[k] != null) $(`use_${k}`).checked = d.selected[k] })

  if ($('acres')) $('acres').value = d.acres || 120
  if ($('numBatches')) $('numBatches').value = d.numBatches || 1
  if ($('cartRental')) $('cartRental').checked = d.cartRental || false
  if ($('customerName')) $('customerName').value = d.customerName || ''
  if ($('targetN')) $('targetN').value = d.targets?.n || 0
  if ($('targetP')) $('targetP').value = d.targets?.p || 0
  if ($('targetK')) $('targetK').value = d.targets?.k || 0
  if ($('targetS')) $('targetS').value = d.targets?.s || 0
  if ($('allowExcess')) $('allowExcess').checked = d.allowExcess !== false
  if ($('notes')) $('notes').value = d.notes || ''
  if (d.rates) keys.forEach(k => { if ($(`rate_${k}`) && d.rates[k] != null) $(`rate_${k}`).value = d.rates[k] })

  calculateAll()
  toast('Blend loaded', 'success')
}

async function deleteBlend() {
  const selVal = $('savedBlends')?.value
  if (!selVal) { toast('Select a blend to delete', 'error'); return }
  if (!confirm('Delete this blend?')) return

  if (currentCompany) {
    try { await deleteBlendFromDB(selVal); toast('Deleted', 'info') } catch (err) { toast(err.message, 'error') }
  } else {
    const blends = JSON.parse(localStorage.getItem('dfc_blends') || '{}')
    delete blends[selVal]
    localStorage.setItem('dfc_blends', JSON.stringify(blends))
    toast('Deleted', 'info')
  }
  loadSavedList()
}

function resetAll() {
  if (!confirm('Reset everything to defaults?')) return
  if ($('blendName')) $('blendName').value = ''
  if ($('customerName')) $('customerName').value = ''
  if ($('notes')) $('notes').value = ''
  if ($('cartRental')) $('cartRental').checked = false
  if ($('acres')) $('acres').value = 120
  if ($('numBatches')) $('numBatches').value = 1
  if ($('targetN')) $('targetN').value = 40; if ($('targetP')) $('targetP').value = 40
  if ($('targetK')) $('targetK').value = 40; if ($('targetS')) $('targetS').value = 20
  if ($('allowExcess')) $('allowExcess').checked = true
  if ($('autoOptimize')) $('autoOptimize').checked = true
  if ($('optimizationNote')) $('optimizationNote').classList.add('hidden')
  renderProducts(); renderRates(); optimizeBlend()
  toast('Reset to defaults', 'info')
}

// ── PDF helpers ────────────────────────────────────────────────────────────
function printQuote() {
  const notes = $('notes')?.value || 'No notes'
  const customer = $('customerName')?.value || 'N/A'
  const blendName = $('blendName')?.value || 'Unnamed'
  const companyName = currentCompany?.name || 'FertCalc Pro'
  const modeLabel = mode === 'liquid' ? 'Liquid' : 'Dry'
  const rateUnit = mode === 'liquid' ? 'gal/acre' : 'lbs/acre'
  const prods = products(); const keys = productKeys()

  const rows = keys.map(k => {
    const p = prods[k]; const rate = val(`rate_${k}`)
    const lbs = mode === 'liquid' ? rate * p.lbsPerGal : rate
    return `<tr><td style="padding:8px 12px;border:1px solid #ddd;">${p.name} ${p.analysis}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${rate.toFixed(2)} ${rateUnit}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">$${(lbs * costPerLb(k)).toFixed(2)}</td></tr>`
  }).join('')

  const html = `<div style="padding:40px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:24px;"><div><h1 style="color:#059669;font-size:26px;margin:0;">${modeLabel} Fertilizer Quote</h1><p style="color:#666;margin:4px 0 0;">${new Date().toLocaleDateString()} · ${companyName}</p></div><div style="text-align:right;font-size:14px;"><div><strong>Customer:</strong> ${customer}</div><div><strong>Blend:</strong> ${blendName}</div></div></div>
    <hr style="border-color:#ddd;margin-bottom:24px;">
    <h2 style="font-size:16px;margin:0 0 8px;">Notes</h2><p style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">${notes}</p>
    <h2 style="font-size:16px;margin:20px 0 8px;">Target (lbs/acre)</h2><p>N: <strong>${$('targetN')?.value}</strong> · P₂O₅: <strong>${$('targetP')?.value}</strong> · K₂O: <strong>${$('targetK')?.value}</strong> · S: <strong>${$('targetS')?.value}</strong></p>
    <h2 style="font-size:16px;margin:20px 0 8px;">Rates</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px;"><tr style="background:#f5f5f5;"><th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Cost/acre</th></tr>${rows}</table>
    <div style="background:#ecfdf5;padding:20px;border-radius:12px;margin:20px 0;"><div style="color:#065f46;font-size:13px;text-transform:uppercase;">Price Per Acre</div><div style="font-size:40px;font-weight:bold;">${$('costPerAcreBig')?.textContent}</div><div style="color:#065f46;">${$('totalFieldCostSmall')?.textContent} · ${$('acres')?.value} acres</div></div>
    <p style="font-size:11px;color:#999;text-align:center;margin-top:32px;">© 2026 ${companyName} · Powered by FertCalc Pro</p></div>`

  html2pdf().set({ margin: 0, filename: `quote-${blendName.replace(/\s+/g,'-')}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(html).save()
}

function printBlendSheet() {
  const customer = $('customerName')?.value
  if (!customer) { toast('Enter a customer name first', 'error'); return }
  const blendName = $('blendName')?.value || 'Unnamed'; const acres = val('acres'); const numBatches = parseInt($('numBatches')?.value) || 1
  const companyName = currentCompany?.name || 'FertCalc Pro'
  const modeLabel = mode === 'liquid' ? 'Liquid' : 'Dry'; const batchUnit = mode === 'liquid' ? 'gal' : 'lbs'
  const rateUnit = mode === 'liquid' ? 'gal/acre' : 'lbs/acre'
  const prods = products(); const keys = productKeys()
  const isLiquid = mode === 'liquid'

  const batchRows = keys.map(k => { const p = prods[k]; const rate = val(`rate_${k}`); if (rate === 0) return null; const totalField = rate * acres; return { label: `${p.name} ${p.analysis}`, color: p.color, rate, perBatch: totalField / numBatches, tons: (isLiquid ? totalField * p.lbsPerGal : totalField) / 2000 } }).filter(Boolean)

  let cum = 0; const tableRows = batchRows.map(r => { cum += r.perBatch; return `<tr><td style="padding:8px 12px;border:1px solid #ddd;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:6px;"></span>${r.label}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.rate.toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${r.perBatch.toFixed(isLiquid?1:0)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#f0fdf4;font-weight:bold;">${cum.toFixed(isLiquid?1:0)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.tons.toFixed(2)}</td></tr>` }).join('')

  const checks = Array.from({length:numBatches},(_,i)=>`<tr><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${i+1}</td><td style="padding:6px 12px;border:1px solid #ddd;width:120px;"></td><td style="padding:6px 12px;border:1px solid #ddd;width:80px;"></td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">☐</td></tr>`).join('')

  const html = `<div style="padding:36px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><h1 style="font-size:24px;margin:0;color:#d97706;">${modeLabel} Blend Sheet</h1><p style="margin:4px 0 0;color:#666;">${new Date().toLocaleDateString()} · ${companyName}</p></div><div style="text-align:right;font-size:14px;"><div><strong>Customer:</strong> ${customer}</div><div><strong>Blend:</strong> ${blendName}</div><div><strong>Acres:</strong> ${acres} · <strong>Batches:</strong> ${numBatches}</div>${checked('cartRental') ? '<div style="color:#d97706;font-weight:bold;">CART RENTAL</div>':''}</div></div>
    <hr style="border-color:#ddd;margin-bottom:20px;">
    ${$('notes')?.value ? `<p style="background:#fffbeb;border:1px solid #fde68a;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:20px;white-space:pre-wrap;">${$('notes').value}</p>`:''}
    <h2 style="font-size:15px;margin:0 0 8px;">Loading Sequence (per batch of ${cum.toFixed(isLiquid?1:0)} ${batchUnit})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;"><tr style="background:#fef3c7;"><th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${batchUnit}/batch</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;background:#f0fdf4;">Cumulative</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Total Tons</th></tr>${tableRows}</table>
    <h2 style="font-size:15px;margin:0 0 8px;">Batch Log</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;"><tr style="background:#f5f5f5;"><th style="padding:6px 12px;border:1px solid #ddd;">Batch #</th><th style="padding:6px 12px;border:1px solid #ddd;">Date/Time</th><th style="padding:6px 12px;border:1px solid #ddd;">Initials</th><th style="padding:6px 12px;border:1px solid #ddd;">Done</th></tr>${checks}</table>
    <p style="font-size:11px;color:#999;text-align:center;">© 2026 ${companyName} · Powered by FertCalc Pro</p></div>`

  html2pdf().set({ margin: 0, filename: `blend-sheet-${blendName.replace(/\s+/g,'-')}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(html).save()
}

// ── Wire Events ────────────────────────────────────────────────────────────
function wireAppEvents() {
  // Theme
  document.querySelectorAll('.theme-toggle').forEach(b => b.addEventListener('click', toggleTheme))
  // Mode
  $('btnModeDry')?.addEventListener('click', () => setMode('dry'))
  $('btnModeLiquid')?.addEventListener('click', () => setMode('liquid'))
  // Actions
  $('btnSaveHeader')?.addEventListener('click', saveBlend)
  $('btnSaveMob')?.addEventListener('click', saveBlend)
  $('btnQuote')?.addEventListener('click', printQuote)
  $('btnBlend')?.addEventListener('click', printBlendSheet)
  $('btnQuoteMob')?.addEventListener('click', printQuote)
  $('btnBlendMob')?.addEventListener('click', printBlendSheet)
  $('btnLoad')?.addEventListener('click', loadBlend)
  $('btnDelete')?.addEventListener('click', deleteBlend)
  $('btnOptimize')?.addEventListener('click', optimizeBlend)
  $('btnResetMob')?.addEventListener('click', resetAll)
  // Admin
  $('btnAdmin')?.addEventListener('click', () => navigate('/admin'))
  $('btnAdminMob')?.addEventListener('click', () => navigate('/admin'))
  // Logout
  $('btnLogoutApp')?.addEventListener('click', async () => { await signOut(); navigate('/login') })
  $('btnLogoutMob')?.addEventListener('click', async () => { await signOut(); navigate('/login') })
  // Mobile menu
  $('btnMenuToggle')?.addEventListener('click', () => { const m = $('mobileMenu'); m?.classList.toggle('hidden'); m?.classList.toggle('flex') })
  // Sidebar
  $('sidebarToggle')?.addEventListener('click', () => { const c = $('sidebarContent'); c?.classList.toggle('hidden'); if ($('sidebarArrow')) $('sidebarArrow').textContent = c?.classList.contains('hidden') ? '▼' : '▲' })
  // Auto-optimize
  ;['targetN','targetP','targetK','targetS'].forEach(id => $(id)?.addEventListener('input', () => { if (checked('autoOptimize')) optimizeBlend() }))
  ;['acres','numBatches'].forEach(id => $(id)?.addEventListener('input', calculateAll))
  $('allowExcess')?.addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
}

// ── Routes ─────────────────────────────────────────────────────────────────
route('/login', () => { renderLogin() })

route('/app', async () => {
  const session = await requireAuth()
  if (!session) return
  renderApp()
})

route('/admin', async () => {
  const session = await requireAuth()
  if (!session) return
  if (currentProfile?.role !== 'super_admin') {
    toast('Admin access required', 'error')
    navigate('/app')
    return
  }
  renderAdmin(currentProfile)
})

// ── Init ───────────────────────────────────────────────────────────────────
applyTheme()

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') navigate('/login')
})

// Start router
;(async () => {
  const session = await getSession()
  if (session && (window.location.hash === '' || window.location.hash === '#/login')) {
    navigate('/app')
  } else if (!session && window.location.hash !== '#/login') {
    navigate('/login')
  }
  startRouter()
})()
