import { listSoilTests, createSoilTest, deleteSoilTest, listFields, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let tests = []
let fields = []
let companyId = null

// Soil test interpretation thresholds (Mehlich-3 based, Midwest ranges)
const THRESHOLDS = {
  ph:     { vl: [0, 5.5], l: [5.5, 6.0], m: [6.0, 7.0], h: [7.0, 7.5], vh: [7.5, 14] },
  om:     { vl: [0, 1.5], l: [1.5, 2.5], m: [2.5, 4.0], h: [4.0, 6.0], vh: [6.0, 100] },
  p_ppm:  { vl: [0, 8], l: [8, 15], m: [15, 30], h: [30, 60], vh: [60, 9999] },
  k_ppm:  { vl: [0, 75], l: [75, 125], m: [125, 200], h: [200, 300], vh: [300, 9999] },
  s_ppm:  { vl: [0, 5], l: [5, 8], m: [8, 15], h: [15, 25], vh: [25, 9999] },
  zn_ppm: { vl: [0, 0.5], l: [0.5, 1.0], m: [1.0, 3.0], h: [3.0, 8.0], vh: [8.0, 9999] },
  b_ppm:  { vl: [0, 0.3], l: [0.3, 0.7], m: [0.7, 1.5], h: [1.5, 3.0], vh: [3.0, 9999] },
  mn_ppm: { vl: [0, 5], l: [5, 15], m: [15, 40], h: [40, 100], vh: [100, 9999] },
  fe_ppm: { vl: [0, 5], l: [5, 15], m: [15, 50], h: [50, 200], vh: [200, 9999] },
  cu_ppm: { vl: [0, 0.3], l: [0.3, 0.8], m: [0.8, 3.0], h: [3.0, 10], vh: [10, 9999] },
}

const LEVEL_LABELS = { vl: 'Very Low', l: 'Low', m: 'Optimum', h: 'High', vh: 'Very High' }
const LEVEL_COLORS = {
  vl: 'bg-red-900/60 text-red-400',
  l: 'bg-amber-900/60 text-amber-400',
  m: 'bg-emerald-900/60 text-emerald-400',
  h: 'bg-blue-900/60 text-blue-400',
  vh: 'bg-violet-900/60 text-violet-400'
}

function getLevel(metric, value) {
  if (value == null || value === 0) return null
  const t = THRESHOLDS[metric]
  if (!t) return null
  for (const [level, [min, max]] of Object.entries(t)) {
    if (value >= min && value < max) return level
  }
  return 'vh'
}

function levelBadge(metric, value) {
  const level = getLevel(metric, value)
  if (!level) return ''
  return `<span class="px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[level]}">${LEVEL_LABELS[level]}</span>`
}

export async function renderSoilTests(profile, company) {
  companyId = company?.id
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">🧪 Soil Tests</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Enter and interpret soil test results</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btnNewTest" class="btn-green">+ New Soil Test</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnGoFields" class="btn-ghost">🗺️ Fields</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- New Test Form -->
      <div id="newTestForm" class="hidden card p-5 mb-5">
        <h3 class="text-sm font-semibold mb-3">New Soil Test</h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl">Field</label>
            <select id="ntField" class="inp"><option value="">Select field...</option></select>
          </div>
          <div><label class="lbl">Test Date</label><input id="ntDate" type="date" class="inp" /></div>
          <div><label class="lbl">Lab Name</label><input id="ntLab" type="text" class="inp" placeholder="e.g. Midwest Labs" /></div>
          <div><label class="lbl">Sample Depth</label>
            <select id="ntDepth" class="inp">
              <option>0-6"</option><option>0-8"</option><option>0-12"</option><option>6-24"</option>
            </select>
          </div>
        </div>

        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-4">Core Results</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl">pH</label><input id="ntPh" type="number" step="0.1" class="inp" placeholder="6.5" /></div>
          <div><label class="lbl">Organic Matter %</label><input id="ntOm" type="number" step="0.1" class="inp" placeholder="3.2" /></div>
          <div><label class="lbl">CEC (meq/100g)</label><input id="ntCec" type="number" step="0.1" class="inp" placeholder="18" /></div>
          <div><label class="lbl">Buffer pH</label><input id="ntBufPh" type="number" step="0.1" class="inp" placeholder="6.8" /></div>
        </div>

        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-4">Macronutrients (ppm)</h4>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
          <div><label class="lbl">P</label><input id="ntP" type="number" step="1" class="inp" placeholder="25" /></div>
          <div><label class="lbl">K</label><input id="ntK" type="number" step="1" class="inp" placeholder="180" /></div>
          <div><label class="lbl">S</label><input id="ntS" type="number" step="1" class="inp" placeholder="12" /></div>
          <div><label class="lbl">Ca</label><input id="ntCa" type="number" step="1" class="inp" placeholder="2400" /></div>
          <div><label class="lbl">Mg</label><input id="ntMg" type="number" step="1" class="inp" placeholder="380" /></div>
          <div><label class="lbl">Na</label><input id="ntNa" type="number" step="1" class="inp" placeholder="15" /></div>
        </div>

        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-4">Micronutrients (ppm)</h4>
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
          <div><label class="lbl">Zn</label><input id="ntZn" type="number" step="0.1" class="inp" placeholder="2.5" /></div>
          <div><label class="lbl">B</label><input id="ntB" type="number" step="0.1" class="inp" placeholder="0.8" /></div>
          <div><label class="lbl">Mn</label><input id="ntMn" type="number" step="1" class="inp" placeholder="25" /></div>
          <div><label class="lbl">Fe</label><input id="ntFe" type="number" step="1" class="inp" placeholder="35" /></div>
          <div><label class="lbl">Cu</label><input id="ntCu" type="number" step="0.1" class="inp" placeholder="1.5" /></div>
        </div>

        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-4">Nitrate</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl">Nitrate-N (ppm)</label><input id="ntNitrate" type="number" step="1" class="inp" placeholder="15" /></div>
        </div>

        <div class="mb-3"><label class="lbl">Notes</label><textarea id="ntNotes" rows="2" class="inp resize-y" placeholder="Lab notes, sample info..."></textarea></div>
        <div class="flex gap-2">
          <button id="btnSubmitTest" class="btn-green">Save Soil Test</button>
          <button id="btnCancelTest" class="btn-ghost">Cancel</button>
        </div>
      </div>

      <!-- Tests List -->
      <div id="testsList" class="space-y-4"></div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnGoFields').addEventListener('click', () => navigate('/fields'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })
  document.getElementById('btnNewTest').addEventListener('click', () => document.getElementById('newTestForm').classList.remove('hidden'))
  document.getElementById('btnCancelTest').addEventListener('click', () => document.getElementById('newTestForm').classList.add('hidden'))
  document.getElementById('ntDate').value = new Date().toISOString().split('T')[0]

  // Submit
  document.getElementById('btnSubmitTest').addEventListener('click', async () => {
    const fieldId = document.getElementById('ntField').value
    if (!fieldId) { toast('Select a field', 'error'); return }
    const btn = document.getElementById('btnSubmitTest')
    btn.disabled = true; btn.textContent = 'Saving...'
    try {
      await createSoilTest({
        field_id: fieldId,
        company_id: companyId,
        test_date: document.getElementById('ntDate').value,
        lab_name: document.getElementById('ntLab').value.trim() || null,
        sample_depth: document.getElementById('ntDepth').value,
        ph: parseFloat(document.getElementById('ntPh').value) || null,
        organic_matter: parseFloat(document.getElementById('ntOm').value) || null,
        cec: parseFloat(document.getElementById('ntCec').value) || null,
        buffer_ph: parseFloat(document.getElementById('ntBufPh').value) || null,
        p_ppm: parseFloat(document.getElementById('ntP').value) || 0,
        k_ppm: parseFloat(document.getElementById('ntK').value) || 0,
        s_ppm: parseFloat(document.getElementById('ntS').value) || 0,
        ca_ppm: parseFloat(document.getElementById('ntCa').value) || 0,
        mg_ppm: parseFloat(document.getElementById('ntMg').value) || 0,
        na_ppm: parseFloat(document.getElementById('ntNa').value) || 0,
        zn_ppm: parseFloat(document.getElementById('ntZn').value) || 0,
        b_ppm: parseFloat(document.getElementById('ntB').value) || 0,
        mn_ppm: parseFloat(document.getElementById('ntMn').value) || 0,
        fe_ppm: parseFloat(document.getElementById('ntFe').value) || 0,
        cu_ppm: parseFloat(document.getElementById('ntCu').value) || 0,
        nitrate_n_ppm: parseFloat(document.getElementById('ntNitrate').value) || 0,
        notes: document.getElementById('ntNotes').value.trim() || null,
      })
      toast('Soil test saved', 'success')
      document.getElementById('newTestForm').classList.add('hidden')
      loadTests()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = 'Save Soil Test' }
  })

  // Load fields for dropdown, then load tests
  if (companyId) {
    try {
      fields = await listFields(companyId)
      const sel = document.getElementById('ntField')
      fields.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.name} (${f.acres} ac)`; sel.appendChild(o) })
    } catch {}
  }
  loadTests()
}

async function loadTests() {
  if (!companyId) { document.getElementById('testsList').innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No company assigned.</div>'; return }
  try {
    tests = await listSoilTests(companyId)
    renderTestsList()
  } catch (err) { toast('Failed to load: ' + err.message, 'error') }
}

function renderTestsList() {
  const el = document.getElementById('testsList')
  if (!el) return
  if (tests.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No soil tests yet.</div>'; return }

  el.innerHTML = tests.map(t => {
    const field = fields.find(f => f.id === t.field_id)
    const fieldName = field?.name || 'Unknown Field'

    return `
    <div class="card p-4">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="font-semibold text-sm">${fieldName}</h3>
            <span class="text-xs text-zinc-500">${new Date(t.test_date).toLocaleDateString()}</span>
            ${t.lab_name ? `<span class="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">${t.lab_name}</span>` : ''}
            <span class="text-xs text-zinc-500">${t.sample_depth}</span>
          </div>
        </div>
        <button class="btn-red text-xs del-test" data-id="${t.id}">Del</button>
      </div>

      <!-- Core -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div class="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div class="text-xs text-zinc-500">pH</div>
          <div class="font-bold text-lg">${t.ph || '—'}</div>
          ${t.ph ? levelBadge('ph', t.ph) : ''}
        </div>
        <div class="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div class="text-xs text-zinc-500">O.M. %</div>
          <div class="font-bold text-lg">${t.organic_matter || '—'}</div>
          ${t.organic_matter ? levelBadge('om', t.organic_matter) : ''}
        </div>
        <div class="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div class="text-xs text-zinc-500">CEC</div>
          <div class="font-bold text-lg">${t.cec || '—'}</div>
        </div>
        <div class="bg-zinc-800/50 rounded-lg p-2 text-center">
          <div class="text-xs text-zinc-500">Buffer pH</div>
          <div class="font-bold text-lg">${t.buffer_ph || '—'}</div>
        </div>
      </div>

      <!-- Macros -->
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        ${[['P', t.p_ppm, 'p_ppm', 'text-orange-400'], ['K', t.k_ppm, 'k_ppm', 'text-violet-400'], ['S', t.s_ppm, 's_ppm', 'text-emerald-400'], ['Ca', t.ca_ppm, null, 'text-zinc-300'], ['Mg', t.mg_ppm, null, 'text-zinc-300'], ['Na', t.na_ppm, null, 'text-zinc-300']].map(([label, val, metric, color]) => `
          <div class="bg-zinc-800/30 rounded-lg p-2 text-center">
            <div class="text-xs text-zinc-500">${label} ppm</div>
            <div class="font-bold ${color}">${val || '—'}</div>
            ${metric && val ? levelBadge(metric, val) : ''}
          </div>
        `).join('')}
      </div>

      <!-- Micros -->
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
        ${[['Zn', t.zn_ppm, 'zn_ppm'], ['B', t.b_ppm, 'b_ppm'], ['Mn', t.mn_ppm, 'mn_ppm'], ['Fe', t.fe_ppm, 'fe_ppm'], ['Cu', t.cu_ppm, 'cu_ppm']].map(([label, val, metric]) => `
          <div class="bg-zinc-800/30 rounded-lg p-2 text-center">
            <div class="text-xs text-zinc-500">${label} ppm</div>
            <div class="font-semibold text-sm">${val || '—'}</div>
            ${metric && val ? levelBadge(metric, val) : ''}
          </div>
        `).join('')}
      </div>

      ${t.nitrate_n_ppm ? `<div class="mt-2 text-xs text-zinc-500">Nitrate-N: <strong class="text-blue-400">${t.nitrate_n_ppm} ppm</strong> (~${Math.round(t.nitrate_n_ppm * 8)} lbs N/ac credit to 2ft)</div>` : ''}
      ${t.notes ? `<p class="text-xs text-zinc-400 mt-2">${t.notes}</p>` : ''}
    </div>`
  }).join('')

  el.querySelectorAll('.del-test').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this soil test?')) return
      try { await deleteSoilTest(btn.dataset.id); toast('Deleted', 'info'); loadTests() }
      catch (err) { toast(err.message, 'error') }
    })
  })
}
