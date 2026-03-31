import { listApplicationPlans, createApplicationPlan, updateApplicationPlan, deleteApplicationPlan, listFields, listCrops, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

const APP_TYPES = ['Pre-Plant', 'At-Plant/Starter', 'Side-Dress', 'Topdress', 'Fall Application', 'Foliar', 'Manure Credit']
const PLAN_STATUSES = ['Draft', 'Active', 'Completed']

let plans = []
let fields = []
let crops = []
let companyId = null

export async function renderPlanner(profile, company) {
  companyId = company?.id
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">📅 Application Planner</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Plan split applications across the season</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btnNewPlan" class="btn-green">+ New Plan</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnGoFields" class="btn-ghost">🗺️ Fields</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- New Plan Form -->
      <div id="newPlanForm" class="hidden card p-5 mb-5">
        <h3 class="text-sm font-semibold mb-3">New Application Plan</h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl">Plan Name</label><input id="npName" type="text" class="inp" placeholder="e.g. Smith N 80 - 2026 Corn" /></div>
          <div><label class="lbl">Field</label>
            <select id="npField" class="inp"><option value="">Select field...</option></select>
          </div>
          <div><label class="lbl">Crop</label>
            <select id="npCrop" class="inp"><option value="">Select crop...</option></select>
          </div>
          <div><label class="lbl">Yield Goal</label><input id="npYield" type="number" step="1" class="inp" placeholder="200" /></div>
        </div>
        <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 mt-3">Season Totals (lbs/acre)</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl text-blue-400">Total N</label><input id="npN" type="number" step="1" class="inp" placeholder="180" /></div>
          <div><label class="lbl text-orange-400">Total P₂O₅</label><input id="npP" type="number" step="1" class="inp" placeholder="60" /></div>
          <div><label class="lbl text-violet-400">Total K₂O</label><input id="npK" type="number" step="1" class="inp" placeholder="80" /></div>
          <div><label class="lbl text-emerald-400">Total S</label><input id="npS" type="number" step="1" class="inp" placeholder="20" /></div>
        </div>
        <div class="flex gap-2">
          <button id="btnSubmitPlan" class="btn-green">Create Plan</button>
          <button id="btnCancelPlan" class="btn-ghost">Cancel</button>
        </div>
      </div>

      <!-- Plans List -->
      <div id="plansList" class="space-y-4"></div>
    </div>

    <!-- Split Editor Modal -->
    <div id="splitModal" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div class="card p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 id="splitTitle" class="text-lg font-bold">Edit Splits</h2>
          <button id="smClose" class="btn-ghost text-xs">✕</button>
        </div>
        <div id="splitBody"></div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnGoFields').addEventListener('click', () => navigate('/fields'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })
  document.getElementById('btnNewPlan').addEventListener('click', () => document.getElementById('newPlanForm').classList.remove('hidden'))
  document.getElementById('btnCancelPlan').addEventListener('click', () => document.getElementById('newPlanForm').classList.add('hidden'))
  document.getElementById('smClose').addEventListener('click', () => document.getElementById('splitModal').classList.add('hidden'))
  document.getElementById('splitModal').addEventListener('click', (e) => { if (e.target.id === 'splitModal') document.getElementById('splitModal').classList.add('hidden') })

  // Auto-fill from crop selection
  document.getElementById('npCrop').addEventListener('change', () => {
    const crop = crops.find(c => c.name === document.getElementById('npCrop').value)
    if (!crop) return
    const y = parseFloat(document.getElementById('npYield').value) || crop.yield_medium
    document.getElementById('npYield').value = y
    document.getElementById('npN').value = Math.round(crop.n_removal * y)
    document.getElementById('npP').value = Math.round(crop.p2o5_removal * y)
    document.getElementById('npK').value = Math.round(crop.k2o_removal * y)
    document.getElementById('npS').value = Math.round(crop.s_removal * y)
  })

  // Submit
  document.getElementById('btnSubmitPlan').addEventListener('click', async () => {
    const name = document.getElementById('npName').value.trim()
    if (!name) { toast('Plan name required', 'error'); return }
    const btn = document.getElementById('btnSubmitPlan')
    btn.disabled = true; btn.textContent = 'Creating...'
    try {
      const totalN = parseFloat(document.getElementById('npN').value) || 0
      const totalP = parseFloat(document.getElementById('npP').value) || 0
      const totalK = parseFloat(document.getElementById('npK').value) || 0
      const totalS = parseFloat(document.getElementById('npS').value) || 0
      // Auto-generate default splits
      const splits = []
      if (totalP > 0 || totalK > 0) {
        splits.push({ type: 'Pre-Plant', n: Math.round(totalN * 0.3), p: totalP, k: totalK, s: Math.round(totalS * 0.5), applied: false, notes: '' })
      }
      if (totalN > 0) {
        const remaining = totalN - (splits[0]?.n || 0)
        splits.push({ type: 'Side-Dress', n: remaining, p: 0, k: 0, s: totalS - (splits[0]?.s || 0), applied: false, notes: '' })
      }

      await createApplicationPlan({
        company_id: companyId,
        field_id: document.getElementById('npField').value || null,
        plan_name: name,
        crop: document.getElementById('npCrop').value || null,
        yield_goal: parseFloat(document.getElementById('npYield').value) || null,
        total_n: totalN, total_p2o5: totalP, total_k2o: totalK, total_s: totalS,
        splits: JSON.stringify(splits),
      })
      toast('Plan created with auto-generated splits', 'success')
      document.getElementById('newPlanForm').classList.add('hidden')
      loadPlans()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = 'Create Plan' }
  })

  // Load data
  if (companyId) {
    try {
      fields = await listFields(companyId)
      const fSel = document.getElementById('npField')
      fields.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.name} (${f.acres} ac)`; fSel.appendChild(o) })
    } catch {}
    try {
      crops = await listCrops()
      const cSel = document.getElementById('npCrop')
      crops.forEach(c => { const o = document.createElement('option'); o.value = c.name; o.textContent = c.name; cSel.appendChild(o) })
    } catch {}
  }
  loadPlans()
}

async function loadPlans() {
  if (!companyId) return
  try {
    plans = await listApplicationPlans(companyId)
    renderPlansList()
  } catch (err) { toast('Failed to load: ' + err.message, 'error') }
}

function renderPlansList() {
  const el = document.getElementById('plansList')
  if (!el) return
  if (plans.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No plans yet.</div>'; return }

  el.innerHTML = plans.map(p => {
    const splits = typeof p.splits === 'string' ? JSON.parse(p.splits) : (p.splits || [])
    const appliedCount = splits.filter(s => s.applied).length
    const field = fields.find(f => f.id === p.field_id)
    const pctDone = splits.length > 0 ? Math.round((appliedCount / splits.length) * 100) : 0

    return `
    <div class="card p-4">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="font-semibold">${p.plan_name}</h3>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Active' ? 'bg-emerald-900/60 text-emerald-400' : p.status === 'Completed' ? 'bg-blue-900/60 text-blue-400' : 'bg-zinc-700 text-zinc-300'}">${p.status}</span>
          </div>
          <div class="text-xs text-zinc-500 flex gap-3 flex-wrap">
            ${field ? `<span>🗺️ ${field.name}</span>` : ''}
            ${p.crop ? `<span>🌿 ${p.crop}</span>` : ''}
            ${p.yield_goal ? `<span>🎯 ${p.yield_goal}</span>` : ''}
            <span>${p.crop_year}</span>
          </div>
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="btn-ghost text-xs edit-splits" data-id="${p.id}">Edit Splits</button>
          <button class="btn-red text-xs del-plan" data-id="${p.id}">Del</button>
        </div>
      </div>

      <!-- Season totals -->
      <div class="grid grid-cols-4 gap-2 mb-3 text-center">
        <div class="bg-zinc-800/50 rounded-lg p-2"><div class="text-xs text-zinc-500">N</div><div class="font-bold text-blue-400">${p.total_n}</div></div>
        <div class="bg-zinc-800/50 rounded-lg p-2"><div class="text-xs text-zinc-500">P₂O₅</div><div class="font-bold text-orange-400">${p.total_p2o5}</div></div>
        <div class="bg-zinc-800/50 rounded-lg p-2"><div class="text-xs text-zinc-500">K₂O</div><div class="font-bold text-violet-400">${p.total_k2o}</div></div>
        <div class="bg-zinc-800/50 rounded-lg p-2"><div class="text-xs text-zinc-500">S</div><div class="font-bold text-emerald-400">${p.total_s}</div></div>
      </div>

      <!-- Splits timeline -->
      <div class="space-y-2">
        ${splits.map((s, i) => `
          <div class="flex items-center gap-3 p-2 rounded-lg ${s.applied ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-zinc-800/30'}">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.applied ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-400'}">${s.applied ? '✓' : i + 1}</div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">${s.type}</div>
              <div class="text-xs text-zinc-500">N: ${s.n} · P: ${s.p} · K: ${s.k} · S: ${s.s || 0}</div>
            </div>
            ${s.notes ? `<div class="text-xs text-zinc-500 truncate max-w-[120px]">${s.notes}</div>` : ''}
          </div>
        `).join('')}
      </div>

      <!-- Progress bar -->
      <div class="mt-3 flex items-center gap-2">
        <div class="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full transition-all" style="width:${pctDone}%"></div>
        </div>
        <span class="text-xs text-zinc-500">${appliedCount}/${splits.length} applied</span>
      </div>
    </div>`
  }).join('')

  el.querySelectorAll('.edit-splits').forEach(btn => btn.addEventListener('click', () => openSplitEditor(btn.dataset.id)))
  el.querySelectorAll('.del-plan').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this plan?')) return
    try { await deleteApplicationPlan(btn.dataset.id); toast('Deleted', 'info'); loadPlans() }
    catch (err) { toast(err.message, 'error') }
  }))
}

function openSplitEditor(id) {
  const plan = plans.find(p => p.id === id)
  if (!plan) return
  const splits = typeof plan.splits === 'string' ? JSON.parse(plan.splits) : (plan.splits || [])

  document.getElementById('splitTitle').textContent = plan.plan_name
  const body = document.getElementById('splitBody')

  function render() {
    body.innerHTML = `
      <div class="space-y-3">
        ${splits.map((s, i) => `
          <div class="card p-3 bg-zinc-800/30">
            <div class="flex items-center justify-between gap-2 mb-2">
              <select class="inp text-sm py-1 split-type" data-idx="${i}">
                ${APP_TYPES.map(t => `<option ${s.type === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" class="split-applied" data-idx="${i}" ${s.applied ? 'checked' : ''} />
                  <span>Applied</span>
                </label>
                <button class="btn-red text-xs split-del" data-idx="${i}">✕</button>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-2">
              <div><label class="lbl text-blue-400">N</label><input type="number" step="1" class="inp text-sm split-n" data-idx="${i}" value="${s.n}" /></div>
              <div><label class="lbl text-orange-400">P₂O₅</label><input type="number" step="1" class="inp text-sm split-p" data-idx="${i}" value="${s.p}" /></div>
              <div><label class="lbl text-violet-400">K₂O</label><input type="number" step="1" class="inp text-sm split-k" data-idx="${i}" value="${s.k}" /></div>
              <div><label class="lbl text-emerald-400">S</label><input type="number" step="1" class="inp text-sm split-s" data-idx="${i}" value="${s.s || 0}" /></div>
            </div>
            <div class="mt-2"><input type="text" class="inp text-xs split-notes" data-idx="${i}" value="${s.notes || ''}" placeholder="Notes for this split..." /></div>
          </div>
        `).join('')}

        <!-- Remaining -->
        <div id="splitRemaining" class="bg-zinc-800/50 rounded-xl p-3 text-center"></div>

        <div class="flex gap-2">
          <button id="btnAddSplit" class="btn-ghost text-xs">+ Add Split</button>
          <button id="btnSaveSplits" class="btn-green ml-auto">Save</button>
        </div>
      </div>`

    updateRemaining()

    body.querySelector('#btnAddSplit').addEventListener('click', () => {
      splits.push({ type: 'Side-Dress', n: 0, p: 0, k: 0, s: 0, applied: false, notes: '' })
      render()
    })

    body.querySelectorAll('.split-del').forEach(btn => btn.addEventListener('click', () => {
      splits.splice(parseInt(btn.dataset.idx), 1)
      render()
    }))

    // Wire all inputs to update remaining
    body.querySelectorAll('.split-n, .split-p, .split-k, .split-s').forEach(inp => inp.addEventListener('input', updateRemaining))

    body.querySelector('#btnSaveSplits').addEventListener('click', async () => {
      // Collect current values
      body.querySelectorAll('.split-type').forEach(el => splits[el.dataset.idx].type = el.value)
      body.querySelectorAll('.split-n').forEach(el => splits[el.dataset.idx].n = parseFloat(el.value) || 0)
      body.querySelectorAll('.split-p').forEach(el => splits[el.dataset.idx].p = parseFloat(el.value) || 0)
      body.querySelectorAll('.split-k').forEach(el => splits[el.dataset.idx].k = parseFloat(el.value) || 0)
      body.querySelectorAll('.split-s').forEach(el => splits[el.dataset.idx].s = parseFloat(el.value) || 0)
      body.querySelectorAll('.split-applied').forEach(el => splits[el.dataset.idx].applied = el.checked)
      body.querySelectorAll('.split-notes').forEach(el => splits[el.dataset.idx].notes = el.value)

      try {
        await updateApplicationPlan(id, { splits: JSON.stringify(splits) })
        toast('Splits saved', 'success')
        document.getElementById('splitModal').classList.add('hidden')
        loadPlans()
      } catch (err) { toast(err.message, 'error') }
    })

    function updateRemaining() {
      let usedN = 0, usedP = 0, usedK = 0, usedS = 0
      body.querySelectorAll('.split-n').forEach(el => usedN += parseFloat(el.value) || 0)
      body.querySelectorAll('.split-p').forEach(el => usedP += parseFloat(el.value) || 0)
      body.querySelectorAll('.split-k').forEach(el => usedK += parseFloat(el.value) || 0)
      body.querySelectorAll('.split-s').forEach(el => usedS += parseFloat(el.value) || 0)
      const remN = plan.total_n - usedN, remP = plan.total_p2o5 - usedP, remK = plan.total_k2o - usedK, remS = plan.total_s - usedS
      const rem = document.getElementById('splitRemaining')
      if (rem) {
        rem.innerHTML = `
          <div class="text-xs text-zinc-500 mb-1">Remaining to allocate</div>
          <div class="grid grid-cols-4 gap-2">
            <div class="font-bold ${remN < 0 ? 'text-red-400' : 'text-blue-400'}">${remN} N</div>
            <div class="font-bold ${remP < 0 ? 'text-red-400' : 'text-orange-400'}">${remP} P</div>
            <div class="font-bold ${remK < 0 ? 'text-red-400' : 'text-violet-400'}">${remK} K</div>
            <div class="font-bold ${remS < 0 ? 'text-red-400' : 'text-emerald-400'}">${remS} S</div>
          </div>`
      }
    }
  }

  render()
  document.getElementById('splitModal').classList.remove('hidden')
}
