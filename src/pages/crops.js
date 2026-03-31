import { listCrops, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let crops = []
let filterCategory = ''

export async function renderCrops(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">🌿 Crop Library</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Nutrient recommendations by crop and yield goal</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnGoFields" class="btn-ghost">🗺️ Fields</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Category Filters -->
      <div class="flex gap-2 mb-5 flex-wrap">
        <button class="mode-btn mode-btn-active cat-btn" data-cat="">All</button>
        <button class="mode-btn cat-btn" data-cat="Row Crop">Row Crop</button>
        <button class="mode-btn cat-btn" data-cat="Small Grain">Small Grain</button>
        <button class="mode-btn cat-btn" data-cat="Forage">Forage</button>
        <button class="mode-btn cat-btn" data-cat="Specialty">Specialty</button>
      </div>

      <!-- Crops Grid -->
      <div id="cropsList" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <!-- Crop Detail Modal -->
    <div id="cropModal" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div class="card p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 id="cropModalTitle" class="text-lg font-bold"></h2>
          <button id="cmClose" class="btn-ghost text-xs">✕</button>
        </div>
        <div id="cropModalBody"></div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnGoFields').addEventListener('click', () => navigate('/fields'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('mode-btn-active'))
      btn.classList.add('mode-btn-active')
      filterCategory = btn.dataset.cat
      renderCropsList()
    })
  })

  document.getElementById('cmClose').addEventListener('click', () => document.getElementById('cropModal').classList.add('hidden'))
  document.getElementById('cropModal').addEventListener('click', (e) => { if (e.target.id === 'cropModal') document.getElementById('cropModal').classList.add('hidden') })

  try {
    crops = await listCrops()
    renderCropsList()
  } catch (err) { toast('Failed to load crops: ' + err.message, 'error') }
}

const CAT_ICONS = { 'Row Crop': '🌽', 'Small Grain': '🌾', 'Forage': '🌿', 'Specialty': '🥔' }
const CAT_COLORS = { 'Row Crop': 'bg-emerald-900/60 text-emerald-400', 'Small Grain': 'bg-amber-900/60 text-amber-400', 'Forage': 'bg-green-900/60 text-green-400', 'Specialty': 'bg-violet-900/60 text-violet-400' }

function renderCropsList() {
  const el = document.getElementById('cropsList')
  const filtered = filterCategory ? crops.filter(c => c.category === filterCategory) : crops
  if (filtered.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8 col-span-2">No crops found.</div>'; return }

  el.innerHTML = filtered.map(c => {
    const catColor = CAT_COLORS[c.category] || 'bg-zinc-700 text-zinc-300'
    return `
    <div class="card p-4 cursor-pointer hover:border-emerald-700/50 transition-colors crop-card" data-id="${c.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="text-lg">${CAT_ICONS[c.category] || '🌱'}</span>
            <h3 class="font-semibold">${c.name}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${catColor}">${c.category}</span>
          </div>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="bg-zinc-800/50 rounded-lg p-2">
              <div class="text-xs text-zinc-500">N</div>
              <div class="text-sm font-bold text-blue-400">${c.n_rec_low}-${c.n_rec_high}</div>
            </div>
            <div class="bg-zinc-800/50 rounded-lg p-2">
              <div class="text-xs text-zinc-500">P₂O₅</div>
              <div class="text-sm font-bold text-orange-400">${c.p2o5_rec_low}-${c.p2o5_rec_high}</div>
            </div>
            <div class="bg-zinc-800/50 rounded-lg p-2">
              <div class="text-xs text-zinc-500">K₂O</div>
              <div class="text-sm font-bold text-violet-400">${c.k2o_rec_low}-${c.k2o_rec_high}</div>
            </div>
            <div class="bg-zinc-800/50 rounded-lg p-2">
              <div class="text-xs text-zinc-500">S</div>
              <div class="text-sm font-bold text-emerald-400">${c.s_rec_low}-${c.s_rec_high}</div>
            </div>
          </div>
          <div class="text-xs text-zinc-500 mt-2">Yield range: ${c.yield_low}–${c.yield_high} ${c.yield_unit}</div>
        </div>
      </div>
    </div>`
  }).join('')

  el.querySelectorAll('.crop-card').forEach(card => {
    card.addEventListener('click', () => openCropDetail(card.dataset.id))
  })
}

function openCropDetail(id) {
  const c = crops.find(x => x.id === id)
  if (!c) return

  document.getElementById('cropModalTitle').textContent = `${CAT_ICONS[c.category] || '🌱'} ${c.name}`
  const body = document.getElementById('cropModalBody')

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Yield Calculator -->
      <div class="card p-4 bg-zinc-800/30">
        <h3 class="text-sm font-semibold mb-3 text-emerald-400">🎯 Yield-Based Recommendation</h3>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="text-center cursor-pointer yield-preset p-2 rounded-lg hover:bg-zinc-700/50" data-yield="${c.yield_low}">
            <div class="text-xs text-zinc-500">Low</div>
            <div class="font-bold">${c.yield_low}</div>
            <div class="text-xs text-zinc-500">${c.yield_unit}</div>
          </div>
          <div class="text-center cursor-pointer yield-preset p-2 rounded-lg bg-emerald-900/30 border border-emerald-700/30" data-yield="${c.yield_medium}">
            <div class="text-xs text-zinc-500">Medium</div>
            <div class="font-bold text-emerald-400">${c.yield_medium}</div>
            <div class="text-xs text-zinc-500">${c.yield_unit}</div>
          </div>
          <div class="text-center cursor-pointer yield-preset p-2 rounded-lg hover:bg-zinc-700/50" data-yield="${c.yield_high}">
            <div class="text-xs text-zinc-500">High</div>
            <div class="font-bold">${c.yield_high}</div>
            <div class="text-xs text-zinc-500">${c.yield_unit}</div>
          </div>
        </div>
        <div class="flex items-center gap-3 mb-3">
          <label class="lbl mb-0 whitespace-nowrap">Yield Goal:</label>
          <input id="yieldGoal" type="number" step="1" value="${c.yield_medium}" class="inp w-32 text-center font-bold" />
          <span class="text-xs text-zinc-500">${c.yield_unit}</span>
          <button id="btnApplyToCalc" class="btn-green text-xs ml-auto">Apply to Calculator →</button>
        </div>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="bg-zinc-800/50 rounded-xl p-3">
            <div class="text-xs text-zinc-500 mb-1">N Required</div>
            <div id="calcN" class="text-xl font-bold text-blue-400">${Math.round(c.n_removal * c.yield_medium)}</div>
            <div class="text-xs text-zinc-500">lbs/ac</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3">
            <div class="text-xs text-zinc-500 mb-1">P₂O₅ Removal</div>
            <div id="calcP" class="text-xl font-bold text-orange-400">${Math.round(c.p2o5_removal * c.yield_medium)}</div>
            <div class="text-xs text-zinc-500">lbs/ac</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3">
            <div class="text-xs text-zinc-500 mb-1">K₂O Removal</div>
            <div id="calcK" class="text-xl font-bold text-violet-400">${Math.round(c.k2o_removal * c.yield_medium)}</div>
            <div class="text-xs text-zinc-500">lbs/ac</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3">
            <div class="text-xs text-zinc-500 mb-1">S Removal</div>
            <div id="calcS" class="text-xl font-bold text-emerald-400">${Math.round(c.s_removal * c.yield_medium)}</div>
            <div class="text-xs text-zinc-500">lbs/ac</div>
          </div>
        </div>
      </div>

      <!-- Nutrient Removal Table -->
      <div>
        <h3 class="text-sm font-semibold mb-2">Nutrient Removal Per ${c.yield_unit}</h3>
        <div class="overflow-x-auto rounded-xl border border-zinc-800">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-zinc-700 bg-zinc-800/50 text-zinc-400">
              <th class="text-left px-3 py-2 font-medium">Nutrient</th>
              <th class="text-right px-3 py-2 font-medium">lbs per ${c.yield_unit}</th>
            </tr></thead>
            <tbody class="text-zinc-300 divide-y divide-zinc-800">
              <tr><td class="px-3 py-2 text-blue-400">Nitrogen (N)</td><td class="px-3 py-2 text-right font-medium">${c.n_removal}</td></tr>
              <tr><td class="px-3 py-2 text-orange-400">Phosphate (P₂O₅)</td><td class="px-3 py-2 text-right font-medium">${c.p2o5_removal}</td></tr>
              <tr><td class="px-3 py-2 text-violet-400">Potash (K₂O)</td><td class="px-3 py-2 text-right font-medium">${c.k2o_removal}</td></tr>
              <tr><td class="px-3 py-2 text-emerald-400">Sulfur (S)</td><td class="px-3 py-2 text-right font-medium">${c.s_removal}</td></tr>
              ${c.zn_removal > 0 ? `<tr><td class="px-3 py-2 text-cyan-400">Zinc (Zn)</td><td class="px-3 py-2 text-right font-medium">${c.zn_removal}</td></tr>` : ''}
              ${c.b_removal > 0 ? `<tr><td class="px-3 py-2 text-pink-400">Boron (B)</td><td class="px-3 py-2 text-right font-medium">${c.b_removal}</td></tr>` : ''}
              ${c.mn_removal > 0 ? `<tr><td class="px-3 py-2 text-yellow-400">Manganese (Mn)</td><td class="px-3 py-2 text-right font-medium">${c.mn_removal}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recommended Ranges -->
      <div>
        <h3 class="text-sm font-semibold mb-2">Recommended Application Ranges (lbs/ac)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div class="text-xs text-zinc-500 mb-1">Nitrogen</div>
            <div class="font-bold text-blue-400">${c.n_rec_low} – ${c.n_rec_high}</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div class="text-xs text-zinc-500 mb-1">Phosphate</div>
            <div class="font-bold text-orange-400">${c.p2o5_rec_low} – ${c.p2o5_rec_high}</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div class="text-xs text-zinc-500 mb-1">Potash</div>
            <div class="font-bold text-violet-400">${c.k2o_rec_low} – ${c.k2o_rec_high}</div>
          </div>
          <div class="bg-zinc-800/50 rounded-xl p-3 text-center">
            <div class="text-xs text-zinc-500 mb-1">Sulfur</div>
            <div class="font-bold text-emerald-400">${c.s_rec_low} – ${c.s_rec_high}</div>
          </div>
        </div>
      </div>

      ${c.notes ? `<div class="bg-zinc-800/30 border border-zinc-700 rounded-xl p-3"><h3 class="text-xs font-semibold text-zinc-400 mb-1">AGRONOMIC NOTES</h3><p class="text-sm text-zinc-300">${c.notes}</p></div>` : ''}
    </div>`

  // Yield goal input
  const yieldInput = body.querySelector('#yieldGoal')
  const updateCalc = () => {
    const y = parseFloat(yieldInput.value) || 0
    body.querySelector('#calcN').textContent = Math.round(c.n_removal * y)
    body.querySelector('#calcP').textContent = Math.round(c.p2o5_removal * y)
    body.querySelector('#calcK').textContent = Math.round(c.k2o_removal * y)
    body.querySelector('#calcS').textContent = Math.round(c.s_removal * y)
  }
  yieldInput.addEventListener('input', updateCalc)

  // Yield presets
  body.querySelectorAll('.yield-preset').forEach(p => {
    p.addEventListener('click', () => {
      yieldInput.value = p.dataset.yield
      updateCalc()
    })
  })

  // Apply to calculator
  body.querySelector('#btnApplyToCalc').addEventListener('click', () => {
    const y = parseFloat(yieldInput.value) || 0
    const n = Math.round(c.n_removal * y)
    const p = Math.round(c.p2o5_removal * y)
    const k = Math.round(c.k2o_removal * y)
    const s = Math.round(c.s_removal * y)
    // Store in sessionStorage for calculator to pick up
    sessionStorage.setItem('cropTargets', JSON.stringify({ n, p, k, s, crop: c.name, yield: y, yieldUnit: c.yield_unit }))
    document.getElementById('cropModal').classList.add('hidden')
    navigate('/app')
    toast(`Applied ${c.name} @ ${y} ${c.yield_unit} targets to calculator`, 'success')
  })

  document.getElementById('cropModal').classList.remove('hidden')
}
