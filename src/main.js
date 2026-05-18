import './style.css'
import { getSession, getProfile, signOut, supabase, listBlends, saveBlendToDB, deleteBlendFromDB, updateCompany } from './supabase.js'
import { route, navigate, startRouter } from './router.js'
import { renderLogin } from './pages/login.js'
import { renderAdmin } from './pages/admin.js'
import { renderFeatures } from './pages/features.js'
import { renderFields } from './pages/fields.js'
import { renderCrops } from './pages/crops.js'
import { renderSoilTests } from './pages/soil-tests.js'
import { renderInventory } from './pages/inventory.js'
import { renderPlanner } from './pages/planner.js'
import { renderSpreader } from './pages/spreader.js'
import { renderWeather } from './pages/weather.js'
import { renderNutrientPlan } from './pages/nutrient-plan.js'
import { renderVRT } from './pages/vrt.js'
import { renderGrowerPortal } from './pages/grower-portal.js'
import { toast, applyTheme, toggleTheme } from './ui.js'

// ── Product Definitions ────────────────────────────────────────────────────
const DRY_PRODUCTS = {
  an:     { n: 0.34, p: 0,    k: 0,    s: 0,    name: 'Nitrate',  abbr: 'AN',  analysis: '34-0-0',      color: '#ef4444', defaultPrice: 650 },
  urea:   { n: 0.46, p: 0,    k: 0,    s: 0,    name: 'Urea',     abbr: 'UR',  analysis: '46-0-0',      color: '#eab308', defaultPrice: 580 },
  map:    { n: 0.11, p: 0.52, k: 0,    s: 0,    name: 'MAP',      abbr: 'MAP', analysis: '11-52-0',     color: '#f97316', defaultPrice: 720 },
  potash: { n: 0,    p: 0,    k: 0.60, s: 0,    name: 'Potash',   abbr: 'K',   analysis: '0-0-60',      color: '#8b5cf6', defaultPrice: 380 },
  ams:    { n: 0.21, p: 0,    k: 0,    s: 0.24, name: 'AMS',      abbr: 'AMS', analysis: '21-0-0-24S',  color: '#10b981', defaultPrice: 420 },
  gypsum: { n: 0,    p: 0,    k: 0,    s: 0.18, name: 'Gypsum',   abbr: 'GYP', analysis: '0-0-0-18S',   color: '#06b6d4', defaultPrice: 180 },
  boron15: { n: 0,   p: 0,    k: 0,    s: 0,    b: 0.15,          name: 'Boron 15%', abbr: 'BOR', analysis: '0-0-0-15B',   color: '#a16207', defaultPrice: 750 },
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

function allProducts() { return mode === 'dry' ? DRY_PRODUCTS : LIQUID_PRODUCTS }
function products() {
  const all = allProducts()
  const allowed = currentCompany?.enabled_products
  if (!allowed || !Array.isArray(allowed)) return all
  const filtered = {}
  for (const key of Object.keys(all)) {
    if (allowed.includes(key)) filtered[key] = all[key]
  }
  return Object.keys(filtered).length > 0 ? filtered : all
}
function productKeys() { return Object.keys(products()) }
const $ = id => document.getElementById(id)
const val = id => parseFloat($(id)?.value) || 0
const checked = id => $(id)?.checked || false
function costPerLb(key) { return (parseFloat($(`price_${key}`)?.value) || 0) / 2000 }

// ── Auth Guard ─────────────────────────────────────────────────────────────
async function requireAuth() {
  const session = await getSession()
  if (!session) { navigate('/login'); return null }
  // Load profile and company separately to avoid RLS join issues
  try {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (pErr) throw pErr
    if (profile.approved === false) {
      await supabase.auth.signOut()
      navigate('/login')
      return null
    }
    currentProfile = profile
    if (profile.company_id) {
      const { data: company, error: cErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()
      if (cErr) console.error('Company load failed:', cErr)
      currentCompany = company || null
    }
  } catch (err) {
    console.error('Profile load failed:', err)
    currentProfile = { role: 'user', full_name: session.user.email }
    currentCompany = null
  }
  return session
}

// ── Tool Access Control ───────────────────────────────────────────────────
const ALL_TOOLS = [
  { key: 'crops',         route: '/crops',         label: '🌿 Crop Library' },
  { key: 'fields',        route: '/fields',        label: '🗺️ Fields' },
  { key: 'soil-tests',    route: '/soil-tests',    label: '🧪 Soil Tests' },
  { key: 'planner',       route: '/planner',       label: '📅 App Planner' },
  { key: 'inventory',     route: '/inventory',     label: '📦 Inventory' },
  { key: 'spreader',      route: '/spreader',      label: '⚙️ Spreader Cal' },
  { key: 'weather',       route: '/weather',       label: '🌤️ Weather' },
  { key: 'vrt',           route: '/vrt',           label: '🗺️ VRT Rx' },
  { key: 'nutrient-plan', route: '/nutrient-plan', label: '📋 4R Plan' },
  { key: 'grower',        route: '/grower',        label: '👤 Grower Portal' },
]

function getEnabledTools() {
  const isAdmin = currentProfile?.role === 'super_admin'
  if (isAdmin) return ALL_TOOLS // admins see everything
  const allowed = currentCompany?.enabled_tools
  if (!allowed || !Array.isArray(allowed)) return ALL_TOOLS // no restrictions = all
  return ALL_TOOLS.filter(t => allowed.includes(t.key))
}

// ── Render Calculator App ──────────────────────────────────────────────────
function renderApp() {
  const companyLogo = currentCompany?.logo_url || null
  const companyName = currentCompany?.name || null
  const isAdmin = currentProfile?.role === 'super_admin'
  const enabledTools = getEnabledTools()

  document.getElementById('app').innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Header -->
      <header class="flex items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-3 min-w-0">
          <div class="text-3xl">🌾</div>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold leading-tight">FertCalc Pro</h1>
            <p id="appSubtitle" class="text-xs text-zinc-500 mt-0.5">${companyName ? companyName : 'Fertilizer Optimizer'}</p>
          </div>
          ${companyLogo ? `<img src="${companyLogo}" alt="" class="h-8 sm:h-10 w-auto ml-2 opacity-70" />` : ''}
        </div>
        <div class="hidden sm:flex flex-wrap gap-2 items-center shrink-0">
          <button class="theme-toggle" title="Toggle theme">☀️</button>
          <button id="btnSaveHeader" class="btn-blue">💾 Save</button>
          <button id="btnQuote" class="btn-green">📄 Quote</button>
          <button id="btnBlend" class="btn-amber">📦 Blend Sheet</button>
          <div class="relative" id="toolsDropdown">
            <button id="btnToolsMenu" class="btn-ghost">🧰 Tools ▾</button>
            <div id="toolsPanel" class="hidden absolute right-0 top-full mt-1 w-52 card p-2 z-50 shadow-xl space-y-0.5">
              ${enabledTools.map(t => `<button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-700/50 transition-colors nav-tool" data-route="${t.route}">${t.label}</button>`).join('')}
              ${isAdmin ? '<div class="border-t border-zinc-700 my-1"></div>' : ''}
              ${isAdmin ? '<button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-700/50 transition-colors nav-tool" data-route="/features">📋 Features</button>' : ''}
              ${isAdmin ? '<button class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-700/50 transition-colors nav-tool" data-route="/admin">🛠️ Admin</button>' : ''}
            </div>
          </div>
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
        <div class="border-t border-zinc-700 my-1"></div>
        ${enabledTools.map(t => `<button class="btn-ghost w-full justify-center nav-tool" data-route="${t.route}">${t.label}</button>`).join('')}
        <div class="border-t border-zinc-700 my-1"></div>
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
        <div id="stabilizerRow" class="hidden mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 flex-wrap">
          <input type="checkbox" id="useStabilizer" class="w-5 h-5 accent-teal-500 shrink-0" />
          <label for="useStabilizer" id="stabLabel" class="text-teal-400 font-medium text-sm cursor-pointer">🧪 Nitrogen Stabilizer</label>
          <span id="stabQuickInfo" class="text-xs text-zinc-500"></span>
          <button id="btnConfigStabilizer" class="ml-auto text-zinc-500 hover:text-teal-400 text-xs transition-colors" title="Configure stabilizer settings">⚙️</button>
        </div>
        <div id="dryChemicalRow" class="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 flex-wrap">
          <input type="checkbox" id="useDryChemical" class="w-5 h-5 accent-orange-500 shrink-0" />
          <label for="useDryChemical" id="dryChemLabel" class="text-orange-400 font-medium text-sm cursor-pointer">🧪 Chemical Additive</label>
          <span id="dryChemQuickInfo" class="text-xs text-zinc-500"></span>
          <button id="btnConfigDryChem" class="ml-auto text-zinc-500 hover:text-orange-400 text-xs transition-colors" title="Configure chemical settings">⚙️</button>
        </div>
        <div id="seedRow" class="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 flex-wrap">
          <input type="checkbox" id="useSeed" class="w-5 h-5 accent-lime-500 shrink-0" />
          <label for="useSeed" class="text-lime-400 font-medium text-sm cursor-pointer">🌱 Seed</label>
          <input id="seedName" type="text" placeholder="Seed name (e.g. Soybean RR2)" class="inp text-sm py-2 max-w-xs flex-1 min-w-[160px]" />
          <div class="flex items-center gap-2">
            <input id="seedRate" type="number" min="0" step="0.1" placeholder="0" class="inp text-sm py-2 w-24" />
            <span class="text-xs text-zinc-500">lbs/acre</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-zinc-500">$</span>
            <input id="seedPrice" type="number" min="0" step="0.01" placeholder="0.00" class="inp text-sm py-2 w-24" />
            <span class="text-xs text-zinc-500">/lb</span>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Sidebar -->
        <aside class="lg:col-span-3 space-y-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <button id="sidebarToggle" class="lg:hidden btn-ghost w-full justify-between text-sm py-3">
            <span>⚙️ Products &amp; Field Info</span>
            <span id="sidebarArrow" class="text-xs">▼</span>
          </button>
          <div id="sidebarContent" class="space-y-3 hidden lg:block">
            <div class="card p-4">
              <h2 class="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-wide text-zinc-400">
                💰 Products &amp; Prices
                <span id="priceUnitBadge" class="bg-amber-900/60 text-amber-400 px-2 py-0.5 rounded-full text-xs">$/TON</span>
                ${(currentProfile?.role === 'company_admin' || isAdmin) && currentCompany ? '<button id="btnProductSettings" class="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors" title="Manage products & prices">⚙️</button>' : ''}
              </h2>
              <div id="productsContainer" class="space-y-2"></div>
            </div>
            <div class="card p-4">
              <h2 class="text-xs font-semibold mb-3 uppercase tracking-wide text-zinc-400">📍 Field Information</h2>
              <div class="space-y-4">
                <div>
                  <label class="lbl">Acres</label>
                  <div class="stepper-wrap">
                    <button class="stepper-btn stepper-lg" data-target="acres" data-step="-1">−</button>
                    <input id="acres" type="number" value="120" min="1" class="inp-xl" />
                    <button class="stepper-btn stepper-lg" data-target="acres" data-step="1">+</button>
                  </div>
                </div>
                <div>
                  <label class="lbl">Number of Batches</label>
                  <div class="stepper-wrap">
                    <button class="stepper-btn stepper-lg" data-target="numBatches" data-step="-1">−</button>
                    <input id="numBatches" type="number" value="1" min="1" class="inp-xl" />
                    <button class="stepper-btn stepper-lg" data-target="numBatches" data-step="1">+</button>
                  </div>
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
              <div><label class="lbl" style="color:#60a5fa">Nitrogen (N)</label><div class="stepper-wrap"><button class="stepper-btn stepper-lg" data-target="targetN" data-step="-1">−</button><input id="targetN" type="number" step="1" value="40" class="inp-xl" /><button class="stepper-btn stepper-lg" data-target="targetN" data-step="1">+</button></div></div>
              <div><label class="lbl" style="color:#fb923c">Phosphate (P₂O₅)</label><div class="stepper-wrap"><button class="stepper-btn stepper-lg" data-target="targetP" data-step="-1">−</button><input id="targetP" type="number" step="1" value="40" class="inp-xl" /><button class="stepper-btn stepper-lg" data-target="targetP" data-step="1">+</button></div></div>
              <div><label class="lbl" style="color:#a78bfa">Potash (K₂O)</label><div class="stepper-wrap"><button class="stepper-btn stepper-lg" data-target="targetK" data-step="-1">−</button><input id="targetK" type="number" step="1" value="40" class="inp-xl" /><button class="stepper-btn stepper-lg" data-target="targetK" data-step="1">+</button></div></div>
              <div><label class="lbl" style="color:#34d399">Sulfur (S)</label><div class="stepper-wrap"><button class="stepper-btn stepper-lg" data-target="targetS" data-step="-1">−</button><input id="targetS" type="number" step="1" value="20" class="inp-xl" /><button class="stepper-btn stepper-lg" data-target="targetS" data-step="1">+</button></div></div>
              <div id="boronTargetRow" class="hidden"><label class="lbl" style="color:#a16207">Boron (B)</label><div class="stepper-wrap"><button class="stepper-btn stepper-lg" data-target="targetB" data-step="-0.5">−</button><input id="targetB" type="number" step="0.5" value="1" class="inp-xl" /><button class="stepper-btn stepper-lg" data-target="targetB" data-step="0.5">+</button></div></div>
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
            <div class="mb-3 bg-zinc-800/60 border border-zinc-600 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Total Spread Rate</span>
              <span class="text-xl font-bold text-white"><span id="spreadRateValue">0.00</span> <span id="spreadRateUnit" class="text-sm font-medium text-zinc-300">lbs/acre</span></span>
            </div>
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

            <!-- Stabilizer Info -->
            <div id="stabilizerInfo" class="hidden mt-3 bg-teal-900/30 border border-teal-700 rounded-xl px-4 py-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span id="stabInfoTitle" class="text-xs font-semibold text-teal-400 uppercase tracking-wide">🧪 N Stabilizer</span>
                <div class="flex flex-wrap gap-4 text-sm">
                  <span class="text-zinc-400">Rate: <strong class="text-teal-300" id="stabRatePerTon">—</strong> oz/ton</span>
                  <span class="text-zinc-400">Per Acre: <strong class="text-teal-300" id="stabRatePerAcre">—</strong> oz</span>
                  <span class="text-zinc-400">Add'l Cost: <strong class="text-teal-300" id="stabCostPerAcre">—</strong>/acre</span>
                </div>
              </div>
            </div>

            <!-- Dry Chemical Info -->
            <div id="dryChemInfo" class="hidden mt-3 bg-orange-900/30 border border-orange-700 rounded-xl px-4 py-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span id="dryChemInfoTitle" class="text-xs font-semibold text-orange-400 uppercase tracking-wide">🧪 Chemical Additive</span>
                <div class="flex flex-wrap gap-4 text-sm">
                  <span class="text-zinc-400">Rate: <strong class="text-orange-300" id="dryChemRatePerTon">—</strong> oz/ton</span>
                  <span class="text-zinc-400">Per Acre: <strong class="text-orange-300" id="dryChemRatePerAcre">—</strong> oz</span>
                  <span class="text-zinc-400">Add'l Cost: <strong class="text-orange-300" id="dryChemCostPerAcre">—</strong>/acre</span>
                </div>
              </div>
            </div>

            <!-- Delivered -->
            <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div class="text-xs text-zinc-500 mb-1">N</div><div id="nDelivered" class="text-3xl sm:text-4xl font-bold text-blue-400">0.0</div><div class="text-xs text-zinc-500 mt-1">lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div class="text-xs text-zinc-500 mb-1">P₂O₅</div><div id="pDelivered" class="text-3xl sm:text-4xl font-bold text-orange-400">0.0</div><div class="text-xs text-zinc-500 mt-1">lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div class="text-xs text-zinc-500 mb-1">K₂O</div><div id="kDelivered" class="text-3xl sm:text-4xl font-bold text-violet-400">0.0</div><div class="text-xs text-zinc-500 mt-1">lbs/acre</div></div>
              <div class="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div class="text-xs text-zinc-500 mb-1">S</div><div id="sDelivered" class="text-3xl sm:text-4xl font-bold text-emerald-400">0.0</div><div class="text-xs text-zinc-500 mt-1">lbs/acre</div></div>
              <div id="bDeliveredCard" class="hidden bg-zinc-800/50 border border-zinc-700 rounded-2xl p-3 text-center"><div class="text-xs text-zinc-500 mb-1">B</div><div id="bDelivered" class="text-3xl sm:text-4xl font-bold" style="color:#a16207">0.0</div><div class="text-xs text-zinc-500 mt-1">lbs/acre</div></div>
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

            <!-- 1-Gallon Blend Analysis (liquid mode only) -->
            <div id="galAnalysis" class="hidden mt-4 bg-blue-900/30 border border-blue-700 rounded-2xl p-4">
              <h3 class="lbl mb-3">💧 Blend Analysis <span class="text-blue-400 normal-case text-xs font-normal ml-1">(per 1 gallon of blend)</span></h3>
              <div id="galAnalysisContent" class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center"></div>
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
              © 2026 FertCalc Pro${companyName ? ` · ${companyName}` : ''} · Version 7.0
            </div>
          </div>
        </main>
      </div>

      <!-- Product Settings Modal -->
      <div id="productSettingsOverlay" class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div class="card p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold uppercase tracking-wide text-zinc-300">⚙️ Company Settings</h2>
            <button id="btnCloseProductSettings" class="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
          </div>
          <!-- Tabs (only for company_admin / super_admin) -->
          ${(currentProfile?.role === 'company_admin' || isAdmin) && currentCompany ? `
          <div class="flex gap-1 mb-4 border-b border-zinc-700 pb-3">
            <button class="prod-settings-tab text-xs px-3 py-1.5 rounded-lg font-medium transition-colors prod-settings-tab-active" data-pstab="visibility">📦 Products</button>
            <button class="prod-settings-tab text-xs px-3 py-1.5 rounded-lg font-medium transition-colors" data-pstab="prices">💰 Prices</button>
          </div>` : ''}
          <!-- Visibility tab -->
          <div id="psTabVisibility">
            <p class="text-xs text-zinc-500 mb-4">Toggle which products appear in the calculator for your company</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Dry Products</div>
                <div id="prodToggleDry" class="space-y-1"></div>
              </div>
              <div>
                <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Liquid Products</div>
                <div id="prodToggleLiquid" class="space-y-1"></div>
              </div>
            </div>
          </div>
          <!-- Prices tab (company_admin / super_admin only) -->
          ${(currentProfile?.role === 'company_admin' || isAdmin) && currentCompany ? `
          <div id="psTabPrices" class="hidden">
            <p class="text-xs text-zinc-500 mb-3">Set default prices ($/ton) for your company. Leave blank to use system defaults.</p>
            <div id="psPriceInputs" class="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>
          </div>` : ''}
          <div class="flex gap-2 mt-5">
            <button id="btnSaveProductSettings" class="btn-green">Save</button>
            <button id="btnCancelProductSettings" class="btn-ghost">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Chemical Config Modal (all users) -->
      <div id="chemicalConfigOverlay" class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div class="card p-5 w-full max-w-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 id="chemConfigTitle" class="text-sm font-bold uppercase tracking-wide text-zinc-300">🧪 Chemical Settings</h2>
            <button id="btnCloseChemConfig" class="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
          </div>
          <input type="hidden" id="chemConfigType" value="" />
          <div class="space-y-3">
            <div>
              <label class="lbl">Chemical Name</label>
              <input id="chemConfigName" type="text" class="inp" placeholder="e.g. Instinct II" />
            </div>
            <div>
              <label class="lbl">Rate Basis</label>
              <select id="chemConfigRateType" class="inp">
                <option value="per_ton">Per Ton of Fertilizer</option>
                <option value="per_acre">Flat Per Acre</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="lbl">Rate (<span id="chemConfigRateUnit">oz/ton</span>)</label>
                <input id="chemConfigRate" type="number" step="0.1" min="0" class="inp" placeholder="e.g. 64" />
              </div>
              <div>
                <label class="lbl">Price ($/gal)</label>
                <input id="chemConfigPrice" type="number" step="0.01" min="0" class="inp" placeholder="e.g. 48.00" />
              </div>
            </div>
            <p class="text-xs text-zinc-500">${(currentProfile?.role === 'company_admin' || isAdmin) && currentCompany ? 'Changes apply to all users in your company.' : 'Changes are saved locally to your device.'}</p>
          </div>
          <div class="flex gap-2 mt-4">
            <button id="btnSaveChemConfig" class="btn-green">Save</button>
            <button id="btnCancelChemConfig" class="btn-ghost">Cancel</button>
          </div>
        </div>
      </div>
    </div>`

  applyTheme()
  renderProducts()
  renderRates()
  loadSavedList()
  wireAppEvents()
  refreshChemicalLabels()

  // Check for crop targets from crop library
  const cropTargets = sessionStorage.getItem('cropTargets')
  if (cropTargets) {
    try {
      const t = JSON.parse(cropTargets)
      if ($('targetN')) $('targetN').value = t.n || 0
      if ($('targetP')) $('targetP').value = t.p || 0
      if ($('targetK')) $('targetK').value = t.k || 0
      if ($('targetS')) $('targetS').value = t.s || 0
      if ($('targetB')) $('targetB').value = t.b || 1
      if ($('notes') && t.crop) $('notes').value = `${t.crop} @ ${t.yield} ${t.yieldUnit} yield goal`
      sessionStorage.removeItem('cropTargets')
    } catch {}
  }
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
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <input type="checkbox" id="use_${key}" checked class="w-4 h-4 shrink-0" style="accent-color:${p.color}" />
          <div class="badge" style="background:${p.color}">${p.abbr}</div>
          <div class="min-w-0">
            <div class="font-medium text-sm leading-tight">${p.name}</div>
            <div class="text-xs text-zinc-500 leading-tight">${p.analysis}</div>
          </div>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <button class="stepper-btn" data-target="price_${key}" data-step="-1">−</button>
          <input id="price_${key}" type="number" step="1" value="${priceVal}"
            class="w-20 text-right inp py-1.5 rounded-xl text-sm font-semibold" />
          <button class="stepper-btn" data-target="price_${key}" data-step="1">+</button>
        </div>
      </div>`
  }).join('')

  $('priceUnitBadge').textContent = '$/TON'

  for (const k of productKeys()) {
    $(`price_${k}`)?.addEventListener('input', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
    $(`price_${k}`)?.addEventListener('change', savePrices)
    $(`use_${k}`)?.addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })
  }

  // Wire stepper buttons
  container.querySelectorAll('.stepper-btn').forEach(btn => {
    btn._stepperWired = true
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target)
      if (!input) return
      const step = parseInt(btn.dataset.step)
      input.value = Math.max(0, parseInt(input.value || 0) + step)
      input.dispatchEvent(new Event('input'))
      input.dispatchEvent(new Event('change'))
    })
  })
}

function renderRates() {
  const prods = products()
  const unit = mode === 'dry' ? 'lbs/acre' : 'gal/acre'
  if ($('rateUnitLabel')) $('rateUnitLabel').textContent = unit
  if ($('thRate')) $('thRate').textContent = unit
  if ($('spreadRateUnit')) $('spreadRateUnit').textContent = unit

  const container = $('ratesContainer')
  if (!container) return
  container.innerHTML = productKeys().map(key => {
    const p = prods[key]
    return `
      <div>
        <div class="flex flex-col items-center gap-1 mb-1.5">
          <div class="w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:${p.color}">${p.abbr.substring(0,2)}</div>
          <span class="text-xs font-medium truncate text-center">${p.name}</span>
        </div>
        <input id="rate_${key}" type="number" step="0.01" value="0" readonly class="inp-xl-ro" />
        <div class="text-center text-xs text-zinc-600 mt-1">${unit}</div>
      </div>`
  }).join('')
}

// ── Optimize ───────────────────────────────────────────────────────────────
function optimizeBlend() {
  const targetN = val('targetN'), targetP = val('targetP'), targetK = val('targetK'), targetS = val('targetS'), targetB = val('targetB')
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

  if (targetB > 0 && sel['boron15'] && prods['boron15']) {
    lbs['boron15'] = targetB / prods['boron15'].b
  }

  keys.forEach(k => {
    const v = mode === 'liquid' ? lbs[k] / prods[k].lbsPerGal : lbs[k]
    const el = $(`rate_${k}`); if (el) el.value = v.toFixed(2)
  })

  if ($('optimizationNote')) $('optimizationNote').classList.remove('hidden')
  if ($('optimizationWarning')) $('optimizationWarning').classList.add('hidden')
  calculateAll()
}

// ── Nitrogen Stabilizer ────────────────────────────────────────────────────
function getStabilizerSettings() {
  const cp = currentCompany?.default_prices || {}
  return {
    name:  cp.stabilizer_name  || localStorage.getItem('dfc_stabilizer_name')  || 'Nitrogen Stabilizer',
    rate:  parseFloat(cp.stabilizer_rate)  || parseFloat(localStorage.getItem('dfc_stabilizer_rate'))  || 0,
    price: parseFloat(cp.stabilizer_price) || parseFloat(localStorage.getItem('dfc_stabilizer_price')) || 0,
    rateType: cp.stabilizer_rate_type || localStorage.getItem('dfc_stabilizer_rate_type') || 'per_ton',
  }
}

// ── Dry Chemical Additive ──────────────────────────────────────────────────
function getDryChemicalSettings() {
  const cp = currentCompany?.default_prices || {}
  return {
    name:  cp.dry_chemical_name  || localStorage.getItem('dfc_dry_chemical_name')  || 'Chemical Additive',
    rate:  parseFloat(cp.dry_chemical_rate)  || parseFloat(localStorage.getItem('dfc_dry_chemical_rate'))  || 0,
    price: parseFloat(cp.dry_chemical_price) || parseFloat(localStorage.getItem('dfc_dry_chemical_price')) || 0,
    rateType: cp.dry_chemical_rate_type || localStorage.getItem('dfc_dry_chemical_rate_type') || 'per_ton',
  }
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

  // Nitrogen Stabilizer (liquid mode only)
  const useStab = isLiquid && checked('useStabilizer')
  let stabCostPerAcre = 0, stabRatePerAcre = 0, stabRateBasis = 0, stabRateBasisUnit = 'oz/ton'
  if (useStab) {
    const stab = getStabilizerSettings()
    if (stab.rate > 0 && stab.price > 0) {
      if (stab.rateType === 'per_acre') {
        stabRatePerAcre = stab.rate
        stabRateBasis = stab.rate
        stabRateBasisUnit = 'oz/acre'
      } else {
        const totalLbsLiquidPerAcre = keys.reduce((sum, k) => sum + lbsPerAcre[k], 0)
        const tonsPerAcre = totalLbsLiquidPerAcre / 2000
        stabRatePerAcre = stab.rate * tonsPerAcre
        stabRateBasis = stab.rate
        stabRateBasisUnit = 'oz/ton'
      }
      stabCostPerAcre = (stabRatePerAcre / 128) * stab.price
      totalCostPerAcre += stabCostPerAcre
    }
    const stabInfoEl = $('stabilizerInfo')
    if (stabInfoEl) {
      const stab2 = getStabilizerSettings()
      if ($('stabInfoTitle')) $('stabInfoTitle').textContent = '🧪 ' + stab2.name
      if (stabRatePerAcre > 0) {
        stabInfoEl.classList.remove('hidden')
        if ($('stabRatePerTon')) {
          $('stabRatePerTon').textContent = stabRateBasis.toFixed(1)
          const rateLabel = $('stabRatePerTon').parentElement
          if (rateLabel) rateLabel.innerHTML = `Rate: <strong class="text-teal-300" id="stabRatePerTon">${stabRateBasis.toFixed(1)}</strong> ${stabRateBasisUnit}`
        }
        if ($('stabRatePerAcre')) $('stabRatePerAcre').textContent = stabRatePerAcre.toFixed(2)
        if ($('stabCostPerAcre')) $('stabCostPerAcre').textContent = '$' + stabCostPerAcre.toFixed(2)
      } else {
        stabInfoEl.classList.add('hidden')
        const q = $('stabQuickInfo'); if (q) q.textContent = stab2.rate > 0 || stab2.price > 0 ? '' : '(click ⚙️ to configure)'
      }
    }
  } else {
    $('stabilizerInfo')?.classList.add('hidden')
  }

  // Chemical Additive (dry mode only)
  const useDryChem = !isLiquid && checked('useDryChemical')
  let dryChemCostPerAcre = 0, dryChemRatePerAcre = 0, dryChemRateBasis = 0, dryChemRateBasisUnit = 'oz/ton'
  if (useDryChem) {
    const dc = getDryChemicalSettings()
    if (dc.rate > 0 && dc.price > 0) {
      if (dc.rateType === 'per_acre') {
        dryChemRatePerAcre = dc.rate
        dryChemRateBasis = dc.rate
        dryChemRateBasisUnit = 'oz/acre'
      } else {
        const totalDryLbsPerAcre = keys.reduce((sum, k) => sum + lbsPerAcre[k], 0)
        const tonsPerAcre = totalDryLbsPerAcre / 2000
        dryChemRatePerAcre = dc.rate * tonsPerAcre
        dryChemRateBasis = dc.rate
        dryChemRateBasisUnit = 'oz/ton'
      }
      dryChemCostPerAcre = (dryChemRatePerAcre / 128) * dc.price
      totalCostPerAcre += dryChemCostPerAcre
    }
    const dryChemInfoEl = $('dryChemInfo')
    if (dryChemInfoEl) {
      const dc2 = getDryChemicalSettings()
      if ($('dryChemInfoTitle')) $('dryChemInfoTitle').textContent = '🧪 ' + dc2.name
      if (dryChemRatePerAcre > 0) {
        dryChemInfoEl.classList.remove('hidden')
        if ($('dryChemRatePerTon')) {
          $('dryChemRatePerTon').textContent = dryChemRateBasis.toFixed(1)
          const rateLabel = $('dryChemRatePerTon').parentElement
          if (rateLabel) rateLabel.innerHTML = `Rate: <strong class="text-orange-300" id="dryChemRatePerTon">${dryChemRateBasis.toFixed(1)}</strong> ${dryChemRateBasisUnit}`
        }
        if ($('dryChemRatePerAcre')) $('dryChemRatePerAcre').textContent = dryChemRatePerAcre.toFixed(2)
        if ($('dryChemCostPerAcre')) $('dryChemCostPerAcre').textContent = '$' + dryChemCostPerAcre.toFixed(2)
      } else {
        dryChemInfoEl.classList.add('hidden')
        const q = $('dryChemQuickInfo'); if (q) q.textContent = dc2.rate > 0 || dc2.price > 0 ? '' : '(click ⚙️ to configure)'
      }
    }
  } else {
    $('dryChemInfo')?.classList.add('hidden')
  }

  // Seed cost (mode-agnostic; rolls into per-acre cost)
  const useSeed = checked('useSeed')
  const seedRatePerAcre = useSeed ? (parseFloat($('seedRate')?.value) || 0) : 0
  const seedPricePerLb = useSeed ? (parseFloat($('seedPrice')?.value) || 0) : 0
  const seedCostPerAcre = seedRatePerAcre * seedPricePerLb
  if (useSeed) totalCostPerAcre += seedCostPerAcre

  let totalN = 0, totalP = 0, totalK = 0, totalS = 0, totalB = 0
  keys.forEach(k => { totalN += lbsPerAcre[k] * prods[k].n; totalP += lbsPerAcre[k] * prods[k].p; totalK += lbsPerAcre[k] * prods[k].k; totalS += lbsPerAcre[k] * prods[k].s; totalB += lbsPerAcre[k] * (prods[k].b || 0) })

  const totalFieldCost = totalCostPerAcre * acres
  const pUnit = isLiquid ? 'gal' : 'lbs'
  let totalSpreadRate = keys.reduce((a, k) => a + rawRates[k], 0)
  if (isLiquid && stabRatePerAcre > 0) totalSpreadRate += stabRatePerAcre / 128
  else if (!isLiquid && dryChemRatePerAcre > 0) totalSpreadRate += dryChemRatePerAcre / 16
  const totalProduct = totalSpreadRate * acres
  const perBatch = numBatches > 0 ? totalProduct / numBatches : 0

  // 1-gallon blend analysis (liquid mode only)
  const galAnalysisEl = $('galAnalysis')
  if (galAnalysisEl) {
    if (isLiquid && totalSpreadRate > 0) {
      const totalLbsBlend = keys.reduce((sum, k) => sum + lbsPerAcre[k], 0)
      const lbsPerGalBlend = totalLbsBlend / totalSpreadRate
      const nPerGal = totalN / totalSpreadRate
      const pPerGal = totalP / totalSpreadRate
      const kPerGal = totalK / totalSpreadRate
      const sPerGal = totalS / totalSpreadRate
      galAnalysisEl.classList.remove('hidden')
      const c = $('galAnalysisContent')
      if (c) c.innerHTML =
        `<div><div class="text-xs text-zinc-500">Weight</div><div class="text-2xl sm:text-3xl font-bold text-white mt-1">${lbsPerGalBlend.toFixed(2)}</div><div class="text-xs text-zinc-600">lbs/gal</div></div>` +
        `<div><div class="text-xs text-zinc-500">Nitrogen</div><div class="text-2xl sm:text-3xl font-bold text-blue-400 mt-1">${nPerGal.toFixed(3)}</div><div class="text-xs text-zinc-600">lbs N/gal</div></div>` +
        `<div><div class="text-xs text-zinc-500">Phosphate</div><div class="text-2xl sm:text-3xl font-bold text-orange-400 mt-1">${pPerGal.toFixed(3)}</div><div class="text-xs text-zinc-600">lbs P₂O₅/gal</div></div>` +
        `<div><div class="text-xs text-zinc-500">Potash</div><div class="text-2xl sm:text-3xl font-bold text-violet-400 mt-1">${kPerGal.toFixed(3)}</div><div class="text-xs text-zinc-600">lbs K₂O/gal</div></div>` +
        `<div><div class="text-xs text-zinc-500">Sulfur</div><div class="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">${sPerGal.toFixed(3)}</div><div class="text-xs text-zinc-600">lbs S/gal</div></div>`
    } else {
      galAnalysisEl.classList.add('hidden')
    }
  }

  if ($('spreadRateValue')) $('spreadRateValue').textContent = totalSpreadRate.toFixed(2)
  if ($('totalProductNeeded')) $('totalProductNeeded').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit
  if ($('productPerBatch')) $('productPerBatch').textContent = perBatch.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit
  if ($('costPerAcreBig')) $('costPerAcreBig').textContent = '$' + totalCostPerAcre.toFixed(2)
  if ($('totalFieldCostSmall')) $('totalFieldCostSmall').textContent = '$' + totalFieldCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' total field cost'
  if ($('totalLbs')) $('totalLbs').textContent = totalProduct.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + pUnit + ' total'
  if ($('nDelivered')) $('nDelivered').textContent = totalN.toFixed(1)
  if ($('pDelivered')) $('pDelivered').textContent = totalP.toFixed(1)
  if ($('kDelivered')) $('kDelivered').textContent = totalK.toFixed(1)
  if ($('sDelivered')) $('sDelivered').textContent = totalS.toFixed(1)

  const boronSelected = mode === 'dry' && checked('use_boron15')
  if ($('boronTargetRow')) $('boronTargetRow').classList.toggle('hidden', !boronSelected)
  if ($('bDeliveredCard')) $('bDeliveredCard').classList.toggle('hidden', !boronSelected)
  if ($('bDelivered')) $('bDelivered').textContent = totalB.toFixed(1)

  // Nutrient target flagging
  const targets = { n: val('targetN'), p: val('targetP'), k: val('targetK'), s: val('targetS'), b: val('targetB') }
  const delivered = { n: totalN, p: totalP, k: totalK, s: totalS, b: totalB }
  const ids = { n: 'nDelivered', p: 'pDelivered', k: 'kDelivered', s: 'sDelivered', b: 'bDelivered' }
  const tolerance = 0.5
  const activeNuts = boronSelected ? ['n', 'p', 'k', 's', 'b'] : ['n', 'p', 'k', 's']
  for (const nut of activeNuts) {
    const el = $(ids[nut])
    if (!el) continue
    const parent = el.parentElement
    const flag = parent.querySelector('.nutrient-flag')
    if (flag) flag.remove()
    parent.classList.remove('nutrient-short', 'nutrient-excess')
    if (targets[nut] > 0 && delivered[nut] < targets[nut] - tolerance) {
      parent.classList.add('nutrient-short')
      const span = document.createElement('div')
      span.className = 'nutrient-flag text-red-400'
      span.textContent = `⚠ Short ${(targets[nut] - delivered[nut]).toFixed(1)}`
      parent.appendChild(span)
    } else if (delivered[nut] > targets[nut] + tolerance && targets[nut] > 0) {
      parent.classList.add('nutrient-excess')
      const span = document.createElement('div')
      span.className = 'nutrient-flag text-amber-400'
      span.textContent = `+${(delivered[nut] - targets[nut]).toFixed(1)} excess`
      parent.appendChild(span)
    }
  }

  // Breakdown table
  if ($('breakdownBody')) {
    const stabTableRow = (useStab && stabRatePerAcre > 0) ? `<tr class="hover:bg-teal-900/20 transition-colors border-t-2 border-teal-800/60 text-teal-300">
        <td class="px-3 py-2.5 font-medium flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block shrink-0 bg-teal-500"></span>${getStabilizerSettings().name}</td>
        <td class="px-3 py-2.5 text-right">${stabRatePerAcre.toFixed(2)} oz</td>
        <td class="px-3 py-2.5 text-right">$${stabCostPerAcre.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
      </tr>` : ''
    const dryChemTableRow = (useDryChem && dryChemRatePerAcre > 0) ? `<tr class="hover:bg-orange-900/20 transition-colors border-t-2 border-orange-800/60 text-orange-300">
        <td class="px-3 py-2.5 font-medium flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block shrink-0 bg-orange-500"></span>${getDryChemicalSettings().name}</td>
        <td class="px-3 py-2.5 text-right">${dryChemRatePerAcre.toFixed(2)} oz</td>
        <td class="px-3 py-2.5 text-right">$${dryChemCostPerAcre.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
        <td class="px-3 py-2.5 text-right text-zinc-600">—</td>
      </tr>` : ''
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
    }).join('') + stabTableRow + dryChemTableRow
  }

  // Cost per lb of nutrient (effective after N credit)
  const priceOf = k => parseFloat($(`price_${k}`)?.value) || 0
  const active = keys.filter(k => lbsPerAcre[k] > 0)

  // Anchor the N cost from a pure-N product when one is in the blend.
  const pureN = active.filter(k => prods[k].n > 0 && prods[k].p === 0 && prods[k].k === 0 && prods[k].s === 0)
  let primaryNcpl = 0
  if (pureN.length > 0) primaryNcpl = costPerLb(pureN[0]) / prods[pureN[0]].n
  else { const nk = active.find(k => prods[k].n > 0); if (nk) primaryNcpl = costPerLb(nk) / prods[nk].n }

  // Effective $/lb of a non-N nutrient from product k: credit the imputed
  // value of its N, then split the remaining price across every non-N
  // nutrient it carries, weighted by pounds — so a multi-nutrient blend
  // shares the residual instead of charging it all to one nutrient.
  const nutrientCpl = k => {
    const p = prods[k]
    const residual = Math.max(0, priceOf(k) - p.n * 2000 * primaryNcpl)
    const nonNlbs = (p.p + p.k + p.s) * 2000
    return nonNlbs > 0 ? residual / nonNlbs : 0
  }

  // Prefer a product whose only non-N nutrient is the target; otherwise
  // fall back to the first blend that contains it.
  const pickSource = nutrient => {
    const others = { p: ['k', 's'], k: ['p', 's'], s: ['p', 'k'] }[nutrient]
    return active.find(k => prods[k][nutrient] > 0 && others.every(o => prods[k][o] === 0))
      || active.find(k => prods[k][nutrient] > 0) || null
  }

  let unitN = '—', unitP = '—', unitK = '—', unitS = '—'
  if (active.some(k => prods[k].n > 0)) unitN = '$' + primaryNcpl.toFixed(3)
  const pSrc = pickSource('p'); if (pSrc) unitP = '$' + nutrientCpl(pSrc).toFixed(3)
  const kSrc = pickSource('k'); if (kSrc) unitK = '$' + nutrientCpl(kSrc).toFixed(3)
  const sSrc = pickSource('s'); if (sSrc) unitS = '$' + nutrientCpl(sSrc).toFixed(3)

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
  const stabRow = $('stabilizerRow')
  if (stabRow) stabRow.classList.toggle('hidden', mode !== 'liquid')
  const dryChemRow = $('dryChemicalRow')
  if (dryChemRow) dryChemRow.classList.toggle('hidden', mode !== 'dry')
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
    cartRental: checked('cartRental'), useStabilizer: checked('useStabilizer'), useDryChemical: checked('useDryChemical'),
    useSeed: checked('useSeed'), seedName: $('seedName')?.value, seedRate: $('seedRate')?.value, seedPrice: $('seedPrice')?.value,
    customerName: $('customerName')?.value,
    targets: { n: $('targetN')?.value, p: $('targetP')?.value, k: $('targetK')?.value, s: $('targetS')?.value, b: $('targetB')?.value },
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
  if ($('useStabilizer')) $('useStabilizer').checked = d.useStabilizer || false
  if ($('useDryChemical')) $('useDryChemical').checked = d.useDryChemical || false
  if ($('useSeed')) $('useSeed').checked = d.useSeed || false
  if ($('seedName')) $('seedName').value = d.seedName || ''
  if ($('seedRate')) $('seedRate').value = d.seedRate || ''
  if ($('seedPrice')) $('seedPrice').value = d.seedPrice || ''
  if ($('customerName')) $('customerName').value = d.customerName || ''
  if ($('targetN')) $('targetN').value = d.targets?.n || 0
  if ($('targetP')) $('targetP').value = d.targets?.p || 0
  if ($('targetK')) $('targetK').value = d.targets?.k || 0
  if ($('targetS')) $('targetS').value = d.targets?.s || 0
  if ($('targetB')) $('targetB').value = d.targets?.b || 1
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
  if ($('targetK')) $('targetK').value = 40; if ($('targetS')) $('targetS').value = 20; if ($('targetB')) $('targetB').value = 1
  if ($('allowExcess')) $('allowExcess').checked = true
  if ($('autoOptimize')) $('autoOptimize').checked = true
  if ($('optimizationNote')) $('optimizationNote').classList.add('hidden')
  renderProducts(); renderRates(); optimizeBlend()
  toast('Reset to defaults', 'info')
}

// ── PDF helpers ────────────────────────────────────────────────────────────
function openPrintWindow(html, title) {
  const w = window.open('', '_blank', 'width=820,height=1060')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{margin:0;}}</style></head><body>${html}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 400)
}

function printQuote() {
  const notes = $('notes')?.value || 'No notes'
  const customer = $('customerName')?.value || 'N/A'
  const blendName = $('blendName')?.value || 'Unnamed'
  const companyName = currentCompany?.name || 'FertCalc Pro'
  const modeLabel = mode === 'liquid' ? 'Liquid' : 'Dry'
  const rateUnit = mode === 'liquid' ? 'gal/acre' : 'lbs/acre'
  const prods = products(); const keys = productKeys()

  const rows = keys.filter(k => val(`rate_${k}`) > 0).map(k => {
    const p = prods[k]; const rate = val(`rate_${k}`)
    const lbs = mode === 'liquid' ? rate * p.lbsPerGal : rate
    return `<tr><td style="padding:8px 12px;border:1px solid #ddd;">${p.name} ${p.analysis}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${rate.toFixed(2)} ${rateUnit}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">$${(lbs * costPerLb(k)).toFixed(2)}</td></tr>`
  }).join('')

  let stabQuoteRow = ''
  if (mode === 'liquid' && checked('useStabilizer')) {
    const stab = getStabilizerSettings()
    if (stab.rate > 0 && stab.price > 0) {
      let stabOzPerAcre
      if (stab.rateType === 'per_acre') {
        stabOzPerAcre = stab.rate
      } else {
        const totalLbsPerAcre = keys.reduce((sum, k) => val(`rate_${k}`) * prods[k].lbsPerGal + sum, 0)
        const tonsPerAcre = totalLbsPerAcre / 2000
        stabOzPerAcre = stab.rate * tonsPerAcre
      }
      const stabCostPerAcre = (stabOzPerAcre / 128) * stab.price
      stabQuoteRow = `<tr style="background:#f0fdfa;"><td style="padding:8px 12px;border:1px solid #ddd;color:#0f766e;">🧪 ${stab.name}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#0f766e;">${stabOzPerAcre.toFixed(2)} oz/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#0f766e;">$${stabCostPerAcre.toFixed(2)}</td></tr>`
    }
  }

  let seedQuoteRow = ''
  if (checked('useSeed')) {
    const seedName = ($('seedName')?.value || 'Seed').trim() || 'Seed'
    const seedRate = parseFloat($('seedRate')?.value) || 0
    const seedPrice = parseFloat($('seedPrice')?.value) || 0
    if (seedRate > 0) {
      const seedCostPerAcre = seedRate * seedPrice
      seedQuoteRow = `<tr style="background:#f7fee7;"><td style="padding:8px 12px;border:1px solid #ddd;color:#4d7c0f;">🌱 ${seedName}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#4d7c0f;">${seedRate.toFixed(2)} lbs/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#4d7c0f;">$${seedCostPerAcre.toFixed(2)}</td></tr>`
    }
  }

  let dryChemQuoteRow = ''
  if (mode === 'dry' && checked('useDryChemical')) {
    const dc = getDryChemicalSettings()
    if (dc.rate > 0 && dc.price > 0) {
      let dcOzPerAcre
      if (dc.rateType === 'per_acre') {
        dcOzPerAcre = dc.rate
      } else {
        const totalDryLbsPerAcre = keys.reduce((sum, k) => val(`rate_${k}`) + sum, 0)
        const tonsPerAcre = totalDryLbsPerAcre / 2000
        dcOzPerAcre = dc.rate * tonsPerAcre
      }
      const dcCostPerAcre = (dcOzPerAcre / 128) * dc.price
      dryChemQuoteRow = `<tr style="background:#fff7ed;"><td style="padding:8px 12px;border:1px solid #ddd;color:#c2410c;">🧪 ${dc.name}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#c2410c;">${dcOzPerAcre.toFixed(2)} oz/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#c2410c;">$${dcCostPerAcre.toFixed(2)}</td></tr>`
    }
  }

  let galQuoteBlock = ''
  if (mode === 'liquid') {
    const activeKeys = keys.filter(k => val(`rate_${k}`) > 0)
    const totalGalPerAcre = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`), 0)
    if (totalGalPerAcre > 0) {
      const totalLbsPerAcre = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal, 0)
      const qN = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].n, 0)
      const qP = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].p, 0)
      const qK = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].k, 0)
      const qS = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].s, 0)
      galQuoteBlock = `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin:20px 0;">` +
        `<div style="font-size:13px;font-weight:600;color:#1d4ed8;text-transform:uppercase;margin-bottom:10px;">💧 Blend Analysis — Per 1 Gallon</div>` +
        `<div style="display:flex;gap:24px;flex-wrap:wrap;font-size:14px;">` +
        `<span>Weight: <strong>${(totalLbsPerAcre/totalGalPerAcre).toFixed(2)} lbs/gal</strong></span>` +
        `<span>N: <strong>${(qN/totalGalPerAcre).toFixed(3)} lbs/gal</strong></span>` +
        `<span>P₂O₅: <strong>${(qP/totalGalPerAcre).toFixed(3)} lbs/gal</strong></span>` +
        `<span>K₂O: <strong>${(qK/totalGalPerAcre).toFixed(3)} lbs/gal</strong></span>` +
        `<span>S: <strong>${(qS/totalGalPerAcre).toFixed(3)} lbs/gal</strong></span>` +
        `</div></div>`
    }
  }

  const html = `<div style="padding:40px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:24px;"><div><h1 style="color:#059669;font-size:26px;margin:0;">${modeLabel} Fertilizer Quote</h1><p style="color:#666;margin:4px 0 0;">${new Date().toLocaleDateString()} · ${companyName}</p></div><div style="text-align:right;font-size:14px;"><div><strong>Customer:</strong> ${customer}</div><div><strong>Blend:</strong> ${blendName}</div></div></div>
    <hr style="border-color:#ddd;margin-bottom:24px;">
    <h2 style="font-size:16px;margin:0 0 8px;">Notes</h2><p style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">${notes}</p>
    <h2 style="font-size:16px;margin:20px 0 8px;">Target (lbs/acre)</h2><p>N: <strong>${$('targetN')?.value}</strong> · P₂O₅: <strong>${$('targetP')?.value}</strong> · K₂O: <strong>${$('targetK')?.value}</strong> · S: <strong>${$('targetS')?.value}</strong>${checked('use_boron15') ? ` · B: <strong>${$('targetB')?.value}</strong>` : ''}</p>
    <h2 style="font-size:16px;margin:20px 0 8px;">Rates</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px;"><tr style="background:#f5f5f5;"><th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Cost/acre</th></tr>${rows}${stabQuoteRow}${dryChemQuoteRow}${seedQuoteRow}</table>
    ${galQuoteBlock}
    <div style="background:#ecfdf5;padding:20px;border-radius:12px;margin:20px 0;"><div style="color:#065f46;font-size:13px;text-transform:uppercase;">Price Per Acre</div><div style="font-size:40px;font-weight:bold;">${$('costPerAcreBig')?.textContent}</div><div style="color:#065f46;">${$('totalFieldCostSmall')?.textContent} · ${$('acres')?.value} acres</div></div>
    <p style="font-size:11px;color:#999;text-align:center;margin-top:32px;">© 2026 ${companyName} · Powered by FertCalc Pro</p></div>`

  openPrintWindow(html, `Quote - ${blendName}`)
  toast('Print dialog opened', 'success')
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

  const batchRows = keys.map(k => { const p = prods[k]; const rate = val(`rate_${k}`); if (rate === 0) return null; const totalField = rate * acres; return { label: `${p.name} ${p.analysis}`, color: p.color, rate, perBatch: totalField / numBatches, tons: ((isLiquid ? totalField * p.lbsPerGal : totalField) / 2000) / numBatches } }).filter(Boolean)
  const totalSpreadRate = batchRows.reduce((sum, r) => sum + r.rate, 0)

  let cum = 0; const tableRows = batchRows.map(r => { cum += r.perBatch; return `<tr><td style="padding:8px 12px;border:1px solid #ddd;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r.color};margin-right:6px;"></span>${r.label}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${r.rate.toFixed(2)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${r.perBatch.toFixed(isLiquid?1:0)}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#f0fdf4;font-weight:bold;">${cum.toFixed(isLiquid?1:0)}</td></tr>` }).join('')
  const cumBeforeSeed = cum

  // Seed row (always last in mixing order) — must be computed before totals block uses these values
  let seedBlendRow = ''
  let seedTotalLbs = 0
  let seedNameDisplay = ''
  if (checked('useSeed')) {
    const seedName = ($('seedName')?.value || 'Seed').trim() || 'Seed'
    const seedRate = parseFloat($('seedRate')?.value) || 0
    if (seedRate > 0) {
      seedTotalLbs = seedRate * acres
      seedNameDisplay = seedName
      const seedPerBatch = seedTotalLbs / numBatches
      const seedScale = isLiquid ? null : (cumBeforeSeed + seedPerBatch)
      const seedScaleCell = seedScale == null ? '—' : seedScale.toFixed(0)
      seedBlendRow = `<tr style="background:#f7fee7;"><td style="padding:8px 12px;border:1px solid #ddd;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#84cc16;margin-right:6px;"></span>🌱 ${seedName}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${seedRate.toFixed(2)} lbs/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${seedPerBatch.toFixed(0)} lbs</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#ecfccb;font-weight:bold;">${seedScaleCell}</td></tr>`
    }
  }

  const totalTons = batchRows.reduce((sum, r) => sum + r.tons, 0)
  const totalTonsAllBatches = totalTons * numBatches
  const isCart = checked('cartRental')
  const productTonsRows = batchRows.map(r => {
    const productTotalTons = r.tons * numBatches
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid ${isCart ? '#fde68a' : '#e5e5e5'};font-size:13px;"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:6px;"></span>${r.label}</span><span>${productTotalTons.toFixed(2)} tons</span></div>`
  }).join('')
  const seedTotalsRow = (checked('useSeed') && seedTotalLbs > 0) ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid ${isCart ? '#fde68a' : '#e5e5e5'};font-size:13px;"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#84cc16;margin-right:6px;"></span>🌱 ${seedNameDisplay}</span><span>${seedTotalLbs.toLocaleString(undefined, { maximumFractionDigits: 0 })} lbs (${(seedTotalLbs/2000).toFixed(2)} tons)</span></div>` : ''
  const totalTonsBlock = `<div style="margin-top:20px;padding:14px 18px;border-radius:8px;background:${isCart ? '#fffbeb' : '#f5f5f5'};border:1px solid ${isCart ? '#fde68a' : '#ddd'};font-size:15px;">
    <div style="font-weight:bold;">${isCart ? '🚜 CART RENTAL — ' : ''}Total Tons (per batch): ${totalTons.toFixed(2)}</div>
    ${numBatches > 1 ? `<div style="margin-top:6px;">Total Tons (${numBatches} batches): <strong>${totalTonsAllBatches.toFixed(2)}</strong></div>` : ''}
    ${(batchRows.length > 0 || seedTotalsRow) ? `<div style="margin-top:10px;font-size:13px;font-weight:600;color:#555;">Tons by Product${numBatches > 1 ? ' (all batches)' : ''}:</div><div style="margin-top:4px;">${productTonsRows}${seedTotalsRow}</div>` : ''}
  </div>`

  // Nitrogen Stabilizer blend sheet section
  let stabBlendRow = ''
  let stabBlendBlock = ''
  let stabSpreadAddOn = 0  // gal/acre to add to spread rate
  let dryChemBlendRow = ''
  let dryChemBlendBlock = ''
  let dryChemSpreadAddOn = 0  // lbs/acre to add to spread rate (oz/16)
  if (!isLiquid && checked('useDryChemical')) {
    const dc = getDryChemicalSettings()
    if (dc.rate > 0 && dc.price > 0) {
      let dcOzPerAcre
      if (dc.rateType === 'per_acre') {
        dcOzPerAcre = dc.rate
      } else {
        const totalTonsField = totalTonsAllBatches
        dcOzPerAcre = (dc.rate * totalTonsField) / acres
      }
      const dcOzField = dcOzPerAcre * acres
      const dcOzPerBatch = dcOzField / numBatches
      const dcGalPerBatch = dcOzPerBatch / 128
      const dcCostPerAcreBlend = (dcOzPerAcre / 128) * dc.price
      const dcRateLabel = dc.rateType === 'per_acre' ? `${dc.rate} oz/acre` : `${dc.rate} oz/ton`
      dryChemSpreadAddOn = dcOzPerAcre / 16  // oz → lbs
      dryChemBlendRow = `<tr style="background:#fff7ed;"><td style="padding:8px 12px;border:1px solid #ddd;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f97316;margin-right:6px;"></span>🧪 ${dc.name}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${dcOzPerAcre.toFixed(2)} oz/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${dcOzPerBatch.toFixed(1)} oz (${dcGalPerBatch.toFixed(2)} gal)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#ffedd5;font-weight:bold;">+$${dcCostPerAcreBlend.toFixed(2)}/acre</td></tr>`
      dryChemBlendBlock = `<div style="margin-top:16px;padding:12px 16px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;font-size:14px;">
        <strong style="color:#c2410c;">🧪 ${dc.name}</strong>
        <div style="margin-top:6px;display:flex;gap:24px;flex-wrap:wrap;">
          <span>Rate: <strong>${dcRateLabel}</strong></span>
          <span>Per Acre: <strong>${dcOzPerAcre.toFixed(2)} oz</strong></span>
          <span>Per Batch: <strong>${dcOzPerBatch.toFixed(1)} oz (${dcGalPerBatch.toFixed(2)} gal)</strong></span>
          <span>Add'l Cost: <strong>$${dcCostPerAcreBlend.toFixed(2)}/acre</strong></span>
        </div>
      </div>`
    }
  }
  if (isLiquid && checked('useStabilizer')) {
    const stab = getStabilizerSettings()
    if (stab.rate > 0 && stab.price > 0) {
      let stabOzPerAcre
      if (stab.rateType === 'per_acre') {
        stabOzPerAcre = stab.rate
      } else {
        const totalTonsField = totalTonsAllBatches
        stabOzPerAcre = (stab.rate * totalTonsField) / acres
      }
      const stabOzField = stabOzPerAcre * acres
      const stabOzPerBatch = stabOzField / numBatches
      const stabGalPerBatch = stabOzPerBatch / 128
      const stabCostPerAcreBlend = (stabOzPerAcre / 128) * stab.price
      const stabRateLabel = stab.rateType === 'per_acre' ? `${stab.rate} oz/acre` : `${stab.rate} oz/ton`
      stabSpreadAddOn = stabOzPerAcre / 128  // oz → gal
      stabBlendRow = `<tr style="background:#f0fdfa;"><td style="padding:8px 12px;border:1px solid #ddd;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#14b8a6;margin-right:6px;"></span>🧪 ${stab.name}</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">${stabOzPerAcre.toFixed(2)} oz/acre</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;font-weight:bold;">${stabOzPerBatch.toFixed(1)} oz (${stabGalPerBatch.toFixed(2)} gal)</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:right;background:#ccfbf1;font-weight:bold;">+$${stabCostPerAcreBlend.toFixed(2)}/acre</td></tr>`
      stabBlendBlock = `<div style="margin-top:16px;padding:12px 16px;border-radius:8px;background:#f0fdfa;border:1px solid #99f6e4;font-size:14px;">
        <strong style="color:#0f766e;">🧪 ${stab.name}</strong>
        <div style="margin-top:6px;display:flex;gap:24px;flex-wrap:wrap;">
          <span>Rate: <strong>${stabRateLabel}</strong></span>
          <span>Per Acre: <strong>${stabOzPerAcre.toFixed(2)} oz</strong></span>
          <span>Per Batch: <strong>${stabOzPerBatch.toFixed(1)} oz (${stabGalPerBatch.toFixed(2)} gal)</strong></span>
          <span>Add'l Cost: <strong>$${stabCostPerAcreBlend.toFixed(2)}/acre</strong></span>
        </div>
      </div>`
    }
  }
  const totalSpreadRateWithAddOns = totalSpreadRate + (isLiquid ? stabSpreadAddOn : dryChemSpreadAddOn)

  let galBlendBlock = ''
  if (isLiquid && totalSpreadRate > 0) {
    const activeKeys = keys.filter(k => val(`rate_${k}`) > 0)
    const bTotalLbs = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal, 0)
    const bN = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].n, 0)
    const bP = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].p, 0)
    const bK = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].k, 0)
    const bS = activeKeys.reduce((sum, k) => sum + val(`rate_${k}`) * prods[k].lbsPerGal * prods[k].s, 0)
    galBlendBlock = `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:14px;">` +
      `<div style="font-size:13px;font-weight:600;color:#1d4ed8;text-transform:uppercase;margin-bottom:8px;">💧 Blend Analysis — Per 1 Gallon</div>` +
      `<div style="display:flex;gap:20px;flex-wrap:wrap;">` +
      `<span>Weight: <strong>${(bTotalLbs/totalSpreadRate).toFixed(2)} lbs/gal</strong></span>` +
      `<span>N: <strong>${(bN/totalSpreadRate).toFixed(3)} lbs/gal</strong></span>` +
      `<span>P₂O₅: <strong>${(bP/totalSpreadRate).toFixed(3)} lbs/gal</strong></span>` +
      `<span>K₂O: <strong>${(bK/totalSpreadRate).toFixed(3)} lbs/gal</strong></span>` +
      `<span>S: <strong>${(bS/totalSpreadRate).toFixed(3)} lbs/gal</strong></span>` +
      `</div></div>`
  }

  const checks = Array.from({length:numBatches},(_,i)=>`<tr><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${i+1}</td><td style="padding:6px 12px;border:1px solid #ddd;width:120px;"></td><td style="padding:6px 12px;border:1px solid #ddd;width:80px;"></td><td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">☐</td></tr>`).join('')

  const html = `<div style="padding:36px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><h1 style="font-size:24px;margin:0;color:#d97706;">${modeLabel} Blend Sheet</h1><p style="margin:4px 0 0;color:#666;">${new Date().toLocaleDateString()} · ${companyName}</p></div><div style="text-align:right;font-size:14px;"><div><strong>Customer:</strong> ${customer}</div><div><strong>Blend:</strong> ${blendName}</div><div><strong>Acres:</strong> ${acres} · <strong>Batches:</strong> ${numBatches}</div><div><strong>Spread Rate:</strong> ${totalSpreadRateWithAddOns.toFixed(2)} ${rateUnit}</div>${checked('cartRental') ? '<div style="color:#d97706;font-weight:bold;">CART RENTAL</div>':''}${checked('useStabilizer') && isLiquid ? `<div style="color:#0f766e;font-weight:bold;">🧪 ${getStabilizerSettings().name.toUpperCase()}</div>` : ''}${checked('useDryChemical') && !isLiquid ? `<div style="color:#c2410c;font-weight:bold;">🧪 ${getDryChemicalSettings().name.toUpperCase()}</div>` : ''}</div></div>
    <hr style="border-color:#ddd;margin-bottom:20px;">
    <div style="background:#fef3c7;border:2px solid #d97706;border-radius:8px;padding:12px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:13px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Total Spread Rate</span>
      <span style="font-size:22px;font-weight:bold;color:#d97706;">${totalSpreadRateWithAddOns.toFixed(2)} <span style="font-size:14px;font-weight:600;">${rateUnit}</span>${(stabSpreadAddOn > 0 || dryChemSpreadAddOn > 0) ? `<div style="font-size:11px;font-weight:500;color:#92400e;margin-top:2px;">includes ${totalSpreadRate.toFixed(2)} ${rateUnit} blend + ${(isLiquid ? stabSpreadAddOn : dryChemSpreadAddOn).toFixed(2)} ${rateUnit} additive</div>` : ''}</span>
    </div>
    ${galBlendBlock}
    ${$('notes')?.value ? `<p style="background:#fffbeb;border:1px solid #fde68a;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:20px;white-space:pre-wrap;">${$('notes').value}</p>`:''}
    <h2 style="font-size:15px;margin:0 0 8px;">Loading Sequence (per batch of ${cum.toFixed(isLiquid?1:0)} ${batchUnit})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;"><tr style="background:#fef3c7;"><th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Product</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${rateUnit}</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${batchUnit}/batch</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;background:#f0fdf4;">Scale</th></tr>${tableRows}${stabBlendRow}${dryChemBlendRow}${seedBlendRow}</table>
    ${stabBlendBlock}${dryChemBlendBlock}
    <h2 style="font-size:15px;margin:${stabBlendBlock || dryChemBlendBlock ? '20px' : '0'} 0 8px;">Batch Log</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;"><tr style="background:#f5f5f5;"><th style="padding:6px 12px;border:1px solid #ddd;">Batch #</th><th style="padding:6px 12px;border:1px solid #ddd;">Date/Time</th><th style="padding:6px 12px;border:1px solid #ddd;">Initials</th><th style="padding:6px 12px;border:1px solid #ddd;">Done</th></tr>${checks}</table>
    ${totalTonsBlock}
    <p style="font-size:11px;color:#999;text-align:center;margin-top:24px;">© 2026 ${companyName} · Powered by FertCalc Pro</p></div>`

  openPrintWindow(html, `Blend Sheet - ${blendName}`)
  toast('Print dialog opened', 'success')
}

// ── Wire Events ────────────────────────────────────────────────────────────
// ── Chemical labels ──────────────────────────────────────────────────────
function refreshChemicalLabels() {
  const stab = getStabilizerSettings()
  const dc = getDryChemicalSettings()
  const stabLbl = $('stabLabel')
  const dcLbl = $('dryChemLabel')
  if (stabLbl) stabLbl.textContent = '🧪 ' + stab.name
  if (dcLbl) dcLbl.textContent = '🧪 ' + dc.name
}

// ── Chemical Config Modal (all users) ────────────────────────────────────
function openChemicalConfig(type) {
  const isStab = type === 'stabilizer'
  const s = isStab ? getStabilizerSettings() : getDryChemicalSettings()
  const title = $('chemConfigTitle')
  if (title) title.textContent = '🧪 ' + (isStab ? 'Stabilizer Settings' : 'Chemical Additive Settings')
  const typeEl = $('chemConfigType')
  if (typeEl) typeEl.value = type
  const nameEl = $('chemConfigName')
  const rateEl = $('chemConfigRate')
  const priceEl = $('chemConfigPrice')
  if (nameEl) nameEl.value = s.name === (isStab ? 'Nitrogen Stabilizer' : 'Chemical Additive') ? '' : s.name
  if (nameEl) nameEl.placeholder = isStab ? 'e.g. Boost or N Edge Pro' : 'e.g. LCO Polymer'
  if (rateEl) rateEl.value = s.rate || ''
  if (priceEl) priceEl.value = s.price || ''
  const rateTypeEl = $('chemConfigRateType')
  if (rateTypeEl) rateTypeEl.value = s.rateType || 'per_ton'
  const rateUnitEl = $('chemConfigRateUnit')
  if (rateUnitEl) rateUnitEl.textContent = (s.rateType === 'per_acre') ? 'oz/acre' : 'oz/ton'
  $('chemicalConfigOverlay')?.classList.remove('hidden')
}

function closeChemicalConfig() {
  $('chemicalConfigOverlay')?.classList.add('hidden')
}

async function saveChemicalConfig() {
  const type = $('chemConfigType')?.value
  const isStab = type === 'stabilizer'
  const name  = $('chemConfigName')?.value.trim()
  const rate  = parseFloat($('chemConfigRate')?.value) || 0
  const price = parseFloat($('chemConfigPrice')?.value) || 0
  const rateType = $('chemConfigRateType')?.value === 'per_acre' ? 'per_acre' : 'per_ton'
  const isAdmin = currentProfile?.role === 'super_admin' || currentProfile?.role === 'company_admin'
  const btn = $('btnSaveChemConfig')
  btn.disabled = true; btn.textContent = 'Saving...'
  try {
    if (isAdmin && currentCompany) {
      const existing = currentCompany.default_prices || {}
      const updates = isStab
        ? { stabilizer_name: name || null, stabilizer_rate: rate || null, stabilizer_price: price || null, stabilizer_rate_type: rateType }
        : { dry_chemical_name: name || null, dry_chemical_rate: rate || null, dry_chemical_price: price || null, dry_chemical_rate_type: rateType }
      const newPrices = { ...existing, ...updates }
      Object.keys(newPrices).forEach(k => { if (newPrices[k] === null) delete newPrices[k] })
      await updateCompany(currentCompany.id, { default_prices: Object.keys(newPrices).length > 0 ? newPrices : null })
      currentCompany.default_prices = Object.keys(newPrices).length > 0 ? newPrices : null
    } else {
      const prefix = isStab ? 'dfc_stabilizer' : 'dfc_dry_chemical'
      if (name) localStorage.setItem(prefix + '_name', name)
      else localStorage.removeItem(prefix + '_name')
      if (rate > 0) localStorage.setItem(prefix + '_rate', rate)
      else localStorage.removeItem(prefix + '_rate')
      if (price > 0) localStorage.setItem(prefix + '_price', price)
      else localStorage.removeItem(prefix + '_price')
      localStorage.setItem(prefix + '_rate_type', rateType)
    }
    refreshChemicalLabels()
    calculateAll()
    closeChemicalConfig()
    toast('Chemical settings saved', 'success')
  } catch (err) {
    toast(err.message, 'error')
  } finally {
    btn.disabled = false; btn.textContent = 'Save'
  }
}

// ── Product Settings (per-company visibility + prices) ────────────────────
function openProductSettings() {
  const dryContainer = $('prodToggleDry')
  const liqContainer = $('prodToggleLiquid')
  if (!dryContainer || !liqContainer) return
  const enabled = currentCompany?.enabled_products

  function renderToggles(prods, container) {
    container.innerHTML = Object.entries(prods).map(([key, p]) => {
      const isOn = !enabled || !Array.isArray(enabled) || enabled.includes(key)
      return '<label class="flex items-center gap-2 px-3 py-2 bg-zinc-800/30 rounded-lg cursor-pointer hover:bg-zinc-800/50">' +
        '<input type="checkbox" class="prod-vis-toggle w-4 h-4 accent-emerald-500" data-product="' + key + '" ' + (isOn ? 'checked' : '') + ' />' +
        '<div class="w-4 h-4 rounded shrink-0" style="background:' + p.color + '"></div>' +
        '<span class="text-sm">' + p.name + ' <span class="text-zinc-500 text-xs">' + p.analysis + '</span></span>' +
        '</label>'
    }).join('')
  }

  renderToggles(DRY_PRODUCTS, dryContainer)
  renderToggles(LIQUID_PRODUCTS, liqContainer)

  // Populate prices tab if it exists
  const priceContainer = $('psPriceInputs')
  if (priceContainer && currentCompany) {
    const allProds = { ...DRY_PRODUCTS, ...LIQUID_PRODUCTS }
    const savedPrices = currentCompany.default_prices || {}
    priceContainer.innerHTML = Object.entries(allProds).map(([key, p]) => {
      const val = savedPrices[key] ?? ''
      return `<div>
        <label class="lbl">${p.name}</label>
        <input type="number" class="inp text-xs ps-price-input" data-key="${key}"
               placeholder="${p.defaultPrice}" value="${val}" step="1" min="0" />
      </div>`
    }).join('')
  }

  // Wire tabs
  document.querySelectorAll('.prod-settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.prod-settings-tab').forEach(t => t.classList.remove('admin-tab-active'))
      tab.classList.add('admin-tab-active')
      const which = tab.dataset.pstab
      const visTab = $('psTabVisibility')
      const priceTab = $('psTabPrices')
      if (visTab) visTab.classList.toggle('hidden', which !== 'visibility')
      if (priceTab) priceTab.classList.toggle('hidden', which !== 'prices')
    })
  })

  // Show first tab
  $('psTabVisibility')?.classList.remove('hidden')
  $('psTabPrices')?.classList.add('hidden')
  document.querySelectorAll('.prod-settings-tab').forEach((t, i) => {
    t.classList.toggle('admin-tab-active', i === 0)
  })

  $('productSettingsOverlay')?.classList.remove('hidden')
}

function closeProductSettings() {
  $('productSettingsOverlay')?.classList.add('hidden')
}

async function saveProductSettings() {
  if (!currentCompany) return
  const btn = $('btnSaveProductSettings')
  btn.disabled = true; btn.textContent = 'Saving...'
  try {
    const enabledProducts = [...document.querySelectorAll('.prod-vis-toggle:checked')].map(cb => cb.dataset.product)
    if (enabledProducts.length === 0) { toast('At least one product must be enabled', 'error'); return }

    // Gather prices from prices tab (if it exists)
    const existingPrices = currentCompany.default_prices || {}
    const newPrices = { ...existingPrices }
    document.querySelectorAll('.ps-price-input').forEach(inp => {
      const v = parseFloat(inp.value)
      if (!isNaN(v) && v > 0) newPrices[inp.dataset.key] = v
      else delete newPrices[inp.dataset.key]
    })
    // Preserve chemical settings keys
    const chemKeys = ['stabilizer_name','stabilizer_rate','stabilizer_price','stabilizer_rate_type','dry_chemical_name','dry_chemical_rate','dry_chemical_price','dry_chemical_rate_type']
    chemKeys.forEach(k => { if (existingPrices[k] !== undefined && newPrices[k] === undefined) newPrices[k] = existingPrices[k] })

    await updateCompany(currentCompany.id, {
      enabled_products: enabledProducts,
      default_prices: Object.keys(newPrices).length > 0 ? newPrices : null,
    })
    currentCompany.enabled_products = enabledProducts
    currentCompany.default_prices = Object.keys(newPrices).length > 0 ? newPrices : null
    renderProducts()
    renderRates()
    if (checked('autoOptimize')) optimizeBlend(); else calculateAll()
    closeProductSettings()
    toast('Settings saved', 'success')
  } catch (err) {
    toast(err.message, 'error')
  } finally {
    btn.disabled = false; btn.textContent = 'Save'
  }
}

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
  $('useStabilizer')?.addEventListener('change', calculateAll)
  $('useDryChemical')?.addEventListener('change', calculateAll)
  $('useSeed')?.addEventListener('change', calculateAll)
  $('seedRate')?.addEventListener('input', calculateAll)
  $('seedPrice')?.addEventListener('input', calculateAll)
  // Tools dropdown
  $('btnToolsMenu')?.addEventListener('click', (e) => {
    e.stopPropagation()
    $('toolsPanel')?.classList.toggle('hidden')
  })
  document.addEventListener('click', () => $('toolsPanel')?.classList.add('hidden'))
  // Nav tool buttons (both desktop dropdown and mobile menu)
  document.querySelectorAll('.nav-tool').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route))
  })
  // Admin mobile
  $('btnAdminMob')?.addEventListener('click', () => navigate('/admin'))
  // Logout
  $('btnLogoutApp')?.addEventListener('click', async () => { await signOut(); navigate('/login') })
  $('btnLogoutMob')?.addEventListener('click', async () => { await signOut(); navigate('/login') })
  // Mobile menu
  $('btnMenuToggle')?.addEventListener('click', () => { const m = $('mobileMenu'); m?.classList.toggle('hidden'); m?.classList.toggle('flex') })
  // Sidebar
  $('sidebarToggle')?.addEventListener('click', () => { const c = $('sidebarContent'); c?.classList.toggle('hidden'); if ($('sidebarArrow')) $('sidebarArrow').textContent = c?.classList.contains('hidden') ? '▼' : '▲' })
  // Product settings (company_admin + super_admin)
  $('btnProductSettings')?.addEventListener('click', openProductSettings)
  $('btnCloseProductSettings')?.addEventListener('click', closeProductSettings)
  $('btnCancelProductSettings')?.addEventListener('click', closeProductSettings)
  $('btnSaveProductSettings')?.addEventListener('click', saveProductSettings)
  // Chemical config (all users)
  $('btnConfigStabilizer')?.addEventListener('click', () => openChemicalConfig('stabilizer'))
  $('btnConfigDryChem')?.addEventListener('click', () => openChemicalConfig('dry_chemical'))
  $('btnCloseChemConfig')?.addEventListener('click', closeChemicalConfig)
  $('btnCancelChemConfig')?.addEventListener('click', closeChemicalConfig)
  $('btnSaveChemConfig')?.addEventListener('click', saveChemicalConfig)
  $('chemConfigRateType')?.addEventListener('change', () => {
    const unitEl = $('chemConfigRateUnit')
    if (unitEl) unitEl.textContent = $('chemConfigRateType').value === 'per_acre' ? 'oz/acre' : 'oz/ton'
  })
  // Auto-optimize
  ;['targetN','targetP','targetK','targetS','targetB'].forEach(id => $(id)?.addEventListener('input', () => { if (checked('autoOptimize')) optimizeBlend() }))
  ;['acres','numBatches'].forEach(id => $(id)?.addEventListener('input', calculateAll))
  $('allowExcess')?.addEventListener('change', () => { if (checked('autoOptimize')) optimizeBlend(); else calculateAll() })

  // Wire all stepper buttons (targets)
  document.querySelectorAll('.stepper-btn').forEach(btn => {
    if (btn._stepperWired) return
    btn._stepperWired = true
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target)
      if (!input) return
      const step = parseInt(btn.dataset.step)
      input.value = Math.max(0, parseInt(input.value || 0) + step)
      input.dispatchEvent(new Event('input'))
      input.dispatchEvent(new Event('change'))
    })
  })
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

route('/features', async () => {
  const session = await requireAuth()
  if (!session) return
  if (currentProfile?.role !== 'super_admin') {
    toast('Admin access required', 'error')
    navigate('/app')
    return
  }
  renderFeatures(currentProfile)
})

route('/fields', async () => {
  const session = await requireAuth()
  if (!session) return
  renderFields(currentProfile, currentCompany)
})

route('/crops', async () => {
  const session = await requireAuth()
  if (!session) return
  renderCrops(currentProfile)
})

route('/soil-tests', async () => {
  const session = await requireAuth()
  if (!session) return
  renderSoilTests(currentProfile, currentCompany)
})

route('/inventory', async () => {
  const session = await requireAuth()
  if (!session) return
  renderInventory(currentProfile, currentCompany)
})

route('/planner', async () => {
  const session = await requireAuth()
  if (!session) return
  renderPlanner(currentProfile, currentCompany)
})

route('/spreader', async () => {
  const session = await requireAuth()
  if (!session) return
  renderSpreader(currentProfile)
})

route('/weather', async () => {
  const session = await requireAuth()
  if (!session) return
  renderWeather(currentProfile)
})

route('/nutrient-plan', async () => {
  const session = await requireAuth()
  if (!session) return
  renderNutrientPlan(currentProfile, currentCompany)
})

route('/vrt', async () => {
  const session = await requireAuth()
  if (!session) return
  renderVRT(currentProfile, currentCompany)
})

route('/grower', async () => {
  const session = await requireAuth()
  if (!session) return
  renderGrowerPortal(currentProfile, currentCompany)
})

// ── Init ───────────────────────────────────────────────────────────────────
applyTheme()

// Show loading spinner while Supabase processes session/auth tokens
document.getElementById('app').innerHTML = '<div class="min-h-screen flex items-center justify-center"><div class="text-zinc-500 text-sm animate-pulse">Loading...</div></div>'

// Use onAuthStateChange for initial routing — fires after Supabase processes
// any auth tokens in the URL (magic links, email confirmations, etc.)
let _routerStarted = false
supabase.auth.onAuthStateChange((event, session) => {
  if (!_routerStarted) {
    _routerStarted = true
    if (session && (window.location.hash === '' || window.location.hash === '#/login')) {
      navigate('/app')
    } else if (!session && window.location.hash !== '#/login') {
      navigate('/login')
    }
    startRouter()
  } else if (event === 'SIGNED_OUT') {
    navigate('/login')
  }
})
