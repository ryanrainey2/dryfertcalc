import { listFields, listSoilTests, listFieldApplications, listApplicationPlans, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let fields = []
let soilTests = []
let applications = []
let plans = []
let companyId = null
let companyName = ''

export async function renderNutrientPlan(profile, company) {
  companyId = company?.id
  companyName = company?.name || 'FertCalc Pro'
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">📋 4R Nutrient Management Plan</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Right Source · Right Rate · Right Time · Right Place</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGenerate" class="btn-green">📄 Generate PDF</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Field Selector -->
      <div class="card p-4 mb-5">
        <div class="flex items-end gap-3 flex-wrap">
          <div class="flex-1 min-w-[200px]">
            <label class="lbl">Select Field</label>
            <select id="npField" class="inp"><option value="">All Fields</option></select>
          </div>
          <div>
            <label class="lbl">Crop Year</label>
            <input id="npYear" type="number" class="inp w-28" value="${new Date().getFullYear()}" />
          </div>
          <button id="btnLoadPlan" class="btn-blue">Load Data</button>
        </div>
      </div>

      <!-- Plan Content -->
      <div id="planContent" class="space-y-5">
        <div class="text-zinc-500 text-sm text-center py-8">Select a field and click Load Data to generate your nutrient management plan.</div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })
  document.getElementById('btnLoadPlan').addEventListener('click', loadPlanData)
  document.getElementById('btnGenerate').addEventListener('click', generatePDF)

  if (companyId) {
    try {
      fields = await listFields(companyId)
      const sel = document.getElementById('npField')
      fields.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.name} (${f.acres} ac)`; sel.appendChild(o) })
    } catch {}
  }
}

async function loadPlanData() {
  if (!companyId) return
  const fieldId = document.getElementById('npField').value || null

  try {
    soilTests = await listSoilTests(companyId, fieldId)
    applications = await listFieldApplications(companyId, fieldId)
    plans = await listApplicationPlans(companyId, fieldId)
    renderPlan()
  } catch (err) { toast('Failed to load: ' + err.message, 'error') }
}

function renderPlan() {
  const el = document.getElementById('planContent')
  const fieldId = document.getElementById('npField').value
  const selectedFields = fieldId ? fields.filter(f => f.id === fieldId) : fields
  const year = document.getElementById('npYear').value

  if (selectedFields.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No fields found.</div>'; return }

  el.innerHTML = `
    <!-- Header Info -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold mb-3 text-emerald-400">Plan Overview</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div class="bg-zinc-800/50 rounded-xl p-3">
          <div class="text-xs text-zinc-500">Fields</div>
          <div class="text-2xl font-bold">${selectedFields.length}</div>
        </div>
        <div class="bg-zinc-800/50 rounded-xl p-3">
          <div class="text-xs text-zinc-500">Total Acres</div>
          <div class="text-2xl font-bold text-emerald-400">${selectedFields.reduce((s, f) => s + (f.acres || 0), 0).toLocaleString()}</div>
        </div>
        <div class="bg-zinc-800/50 rounded-xl p-3">
          <div class="text-xs text-zinc-500">Soil Tests</div>
          <div class="text-2xl font-bold text-blue-400">${soilTests.length}</div>
        </div>
        <div class="bg-zinc-800/50 rounded-xl p-3">
          <div class="text-xs text-zinc-500">App Plans</div>
          <div class="text-2xl font-bold text-amber-400">${plans.length}</div>
        </div>
      </div>
    </div>

    <!-- 4R Summary -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold mb-4 text-amber-400">4R Stewardship Summary</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-zinc-800/30 rounded-xl p-4">
          <h3 class="font-semibold text-blue-400 mb-2">🧪 Right Source</h3>
          <ul class="text-sm text-zinc-300 space-y-1">
            <li>• Products selected based on crop nutrient requirements</li>
            <li>• Multi-nutrient sources used to minimize passes</li>
            <li>• Sulfur sources included where soil tests indicate need</li>
            ${soilTests.some(t => t.ph && t.ph < 6.0) ? '<li class="text-amber-400">• Low pH detected — consider lime application</li>' : ''}
            ${soilTests.some(t => t.zn_ppm && t.zn_ppm < 1.0) ? '<li class="text-amber-400">• Low Zn detected — zinc sulfate recommended</li>' : ''}
          </ul>
        </div>
        <div class="bg-zinc-800/30 rounded-xl p-4">
          <h3 class="font-semibold text-emerald-400 mb-2">📊 Right Rate</h3>
          <ul class="text-sm text-zinc-300 space-y-1">
            <li>• Rates based on yield goals and soil test levels</li>
            <li>• Crop removal balanced with soil test adjustments</li>
            <li>• Credit given for previous crop residual N</li>
            ${soilTests.some(t => t.nitrate_n_ppm > 10) ? '<li class="text-emerald-400">• Nitrate-N credits applied from soil test</li>' : ''}
          </ul>
        </div>
        <div class="bg-zinc-800/30 rounded-xl p-4">
          <h3 class="font-semibold text-violet-400 mb-2">📅 Right Time</h3>
          <ul class="text-sm text-zinc-300 space-y-1">
            <li>• Split N applications to reduce loss potential</li>
            <li>• P and K applied pre-plant for incorporation</li>
            <li>• Side-dress N timed to crop demand</li>
            ${plans.some(p => { const s = typeof p.splits === 'string' ? JSON.parse(p.splits) : p.splits; return s && s.length > 1 }) ? '<li class="text-emerald-400">• Split application plans active</li>' : '<li class="text-amber-400">• Consider splitting N for better efficiency</li>'}
          </ul>
        </div>
        <div class="bg-zinc-800/30 rounded-xl p-4">
          <h3 class="font-semibold text-orange-400 mb-2">📍 Right Place</h3>
          <ul class="text-sm text-zinc-300 space-y-1">
            <li>• Broadcast application with incorporation where possible</li>
            <li>• Banded starter where applicable</li>
            <li>• Soil test-based variable rate opportunities identified</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Field Details -->
    ${selectedFields.map(f => {
      const fieldTests = soilTests.filter(t => t.field_id === f.id)
      const fieldApps = applications.filter(a => a.field_id === f.id)
      const fieldPlans = plans.filter(p => p.field_id === f.id)
      const latestTest = fieldTests[0]

      return `
      <div class="card p-5">
        <h2 class="font-semibold mb-3 flex items-center gap-2">
          🗺️ ${f.name}
          <span class="text-sm text-emerald-400 font-normal">${f.acres} ac</span>
          ${f.county ? `<span class="text-xs text-zinc-500">${f.county}${f.state ? ', ' + f.state : ''}</span>` : ''}
        </h2>

        ${latestTest ? `
        <div class="mb-3">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase mb-2">Latest Soil Test (${new Date(latestTest.test_date).toLocaleDateString()})</h3>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-sm">
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">pH</div><div class="font-bold">${latestTest.ph || '—'}</div></div>
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">O.M.%</div><div class="font-bold">${latestTest.organic_matter || '—'}</div></div>
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">P ppm</div><div class="font-bold text-orange-400">${latestTest.p_ppm || '—'}</div></div>
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">K ppm</div><div class="font-bold text-violet-400">${latestTest.k_ppm || '—'}</div></div>
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">S ppm</div><div class="font-bold text-emerald-400">${latestTest.s_ppm || '—'}</div></div>
            <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">CEC</div><div class="font-bold">${latestTest.cec || '—'}</div></div>
          </div>
        </div>` : '<p class="text-xs text-amber-400 mb-3">⚠️ No soil test on file — recommend sampling</p>'}

        ${fieldPlans.length > 0 ? `
        <div class="mb-3">
          <h3 class="text-xs font-semibold text-zinc-400 uppercase mb-2">Application Plans (${year})</h3>
          ${fieldPlans.map(p => {
            const splits = typeof p.splits === 'string' ? JSON.parse(p.splits) : (p.splits || [])
            return `
            <div class="bg-zinc-800/30 rounded-lg p-3 mb-2">
              <div class="font-medium text-sm mb-1">${p.plan_name} · ${p.crop || 'Unknown crop'}</div>
              <div class="text-xs text-zinc-500 mb-2">Season totals: N ${p.total_n} · P ${p.total_p2o5} · K ${p.total_k2o} · S ${p.total_s} lbs/ac</div>
              <div class="space-y-1">
                ${splits.map(s => `
                  <div class="flex items-center gap-2 text-xs">
                    <span class="w-4 h-4 rounded-full ${s.applied ? 'bg-emerald-600' : 'bg-zinc-600'} flex items-center justify-center text-white text-xs">${s.applied ? '✓' : '○'}</span>
                    <span class="font-medium">${s.type}:</span>
                    <span class="text-zinc-400">N ${s.n} · P ${s.p} · K ${s.k} · S ${s.s || 0}</span>
                  </div>
                `).join('')}
              </div>
            </div>`
          }).join('')}
        </div>` : ''}

        ${fieldApps.length > 0 ? `
        <div>
          <h3 class="text-xs font-semibold text-zinc-400 uppercase mb-2">Application History</h3>
          <div class="overflow-x-auto rounded-lg border border-zinc-800">
            <table class="w-full text-xs">
              <thead><tr class="bg-zinc-800/50 text-zinc-400"><th class="px-3 py-2 text-left">Date</th><th class="px-3 py-2 text-left">Type</th><th class="px-3 py-2 text-right">N</th><th class="px-3 py-2 text-right">P</th><th class="px-3 py-2 text-right">K</th><th class="px-3 py-2 text-right">S</th><th class="px-3 py-2 text-right">$/ac</th></tr></thead>
              <tbody class="text-zinc-300 divide-y divide-zinc-800">
                ${fieldApps.map(a => `<tr><td class="px-3 py-1.5">${new Date(a.application_date).toLocaleDateString()}</td><td class="px-3 py-1.5">${a.application_type}</td><td class="px-3 py-1.5 text-right">${a.n_applied}</td><td class="px-3 py-1.5 text-right">${a.p2o5_applied}</td><td class="px-3 py-1.5 text-right">${a.k2o_applied}</td><td class="px-3 py-1.5 text-right">${a.s_applied}</td><td class="px-3 py-1.5 text-right">$${(a.cost_per_acre || 0).toFixed(2)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
      </div>`
    }).join('')}
  `
}

function generatePDF() {
  const content = document.getElementById('planContent')
  if (!content || content.children.length === 0) { toast('Load data first', 'error'); return }

  const year = document.getElementById('npYear').value
  const html = `<div style="padding:40px;font-family:Arial,sans-serif;max-width:800px;margin:auto;color:#111;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="font-size:24px;color:#059669;margin:0;">4R Nutrient Management Plan</h1>
      <p style="color:#666;margin:4px 0 0;">${companyName} · ${year} Crop Year</p>
      <p style="color:#999;font-size:12px;margin:4px 0 0;">Generated ${new Date().toLocaleDateString()} · FertCalc Pro</p>
    </div>
    <hr style="border-color:#ddd;margin-bottom:20px;">
    ${content.innerHTML.replace(/class="[^"]*"/g, '').replace(/style="[^"]*"/g, '')}
    <div style="margin-top:40px;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
      <h3 style="color:#059669;margin:0 0 8px;">4R Certification Statement</h3>
      <p style="font-size:13px;margin:0;">This Nutrient Management Plan follows 4R principles: Right Source, Right Rate, Right Time, and Right Place. Nutrient recommendations are based on soil test results, crop removal rates, and yield goals. This plan should be reviewed and updated annually.</p>
    </div>
    <div style="margin-top:20px;border-top:1px solid #ddd;padding-top:15px;">
      <div style="display:flex;justify-content:space-between;">
        <div><p style="font-size:12px;color:#999;">Prepared By: _________________________</p><p style="font-size:12px;color:#999;">Date: _________________________</p></div>
        <div><p style="font-size:12px;color:#999;">Reviewed By: _________________________</p><p style="font-size:12px;color:#999;">Date: _________________________</p></div>
      </div>
    </div>
    <p style="text-align:center;font-size:10px;color:#999;margin-top:24px;">© ${year} ${companyName} · Powered by FertCalc Pro</p>
  </div>`

  if (typeof html2pdf === 'undefined') { toast('PDF library not loaded', 'error'); return }
  html2pdf().set({ margin: 0, filename: `nutrient-plan-${year}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(html).save()
  toast('PDF generated', 'success')
}
