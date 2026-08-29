import { listFields, listSoilTests, listFieldApplications, listApplicationPlans, listBlends, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast, icon } from '../ui.js'

let fields = []
let soilTests = []
let applications = []
let plans = []
let blends = []
let companyId = null

export async function renderGrowerPortal(profile, company) {
  companyId = company?.id
  const growerName = profile?.full_name || 'Grower'
  const companyName = company?.name || 'FertCalc Pro'

  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">${icon('user','w-5 h-5 inline -mt-0.5')} Welcome, ${growerName}</h1>
          <p class="text-xs text-zinc-500 mt-0.5">${companyName} · Grower Portal</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-ghost">${icon('wheat','w-4 h-4 inline -mt-0.5')} Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="card p-4 text-center">
          <div id="gpFields" class="text-3xl font-bold">0</div>
          <div class="text-xs text-zinc-500">Fields</div>
        </div>
        <div class="card p-4 text-center">
          <div id="gpAcres" class="text-3xl font-bold text-emerald-400">0</div>
          <div class="text-xs text-zinc-500">Total Acres</div>
        </div>
        <div class="card p-4 text-center">
          <div id="gpTests" class="text-3xl font-bold text-blue-400">0</div>
          <div class="text-xs text-zinc-500">Soil Tests</div>
        </div>
        <div class="card p-4 text-center">
          <div id="gpPlans" class="text-3xl font-bold text-amber-400">0</div>
          <div class="text-xs text-zinc-500">Active Plans</div>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex gap-2 mb-5 flex-wrap">
        <button class="mode-btn mode-btn-active gp-tab" data-tab="fields">${icon('layers','w-4 h-4 inline -mt-0.5')} My Fields</button>
        <button class="mode-btn gp-tab" data-tab="tests">${icon('flask','w-4 h-4 inline -mt-0.5')} Soil Tests</button>
        <button class="mode-btn gp-tab" data-tab="plans">${icon('calendar','w-4 h-4 inline -mt-0.5')} Plans</button>
        <button class="mode-btn gp-tab" data-tab="blends">${icon('package','w-4 h-4 inline -mt-0.5')} Blends</button>
        <button class="mode-btn gp-tab" data-tab="history">${icon('clipboard','w-4 h-4 inline -mt-0.5')} History</button>
      </div>

      <!-- Tab Content -->
      <div id="gpContent" class="space-y-3"></div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  let activeTab = 'fields'
  document.querySelectorAll('.gp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gp-tab').forEach(b => b.classList.remove('mode-btn-active'))
      btn.classList.add('mode-btn-active')
      activeTab = btn.dataset.tab
      renderTab(activeTab)
    })
  })

  // Load all data
  if (companyId) {
    try {
      [fields, soilTests, applications, plans] = await Promise.all([
        listFields(companyId),
        listSoilTests(companyId),
        listFieldApplications(companyId),
        listApplicationPlans(companyId),
      ])
      try { blends = await listBlends(companyId) } catch { blends = [] }
    } catch (err) { toast('Failed to load data: ' + err.message, 'error') }
  }

  // Stats
  document.getElementById('gpFields').textContent = fields.length
  document.getElementById('gpAcres').textContent = fields.reduce((s, f) => s + (f.acres || 0), 0).toLocaleString()
  document.getElementById('gpTests').textContent = soilTests.length
  document.getElementById('gpPlans').textContent = plans.filter(p => p.status === 'Active' || p.status === 'Draft').length

  renderTab('fields')
}

function renderTab(tab) {
  const el = document.getElementById('gpContent')
  if (!el) return

  switch (tab) {
    case 'fields':
      if (fields.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No fields on file.</div>'; return }
      el.innerHTML = fields.map(f => {
        const fTests = soilTests.filter(t => t.field_id === f.id)
        const latestTest = fTests[0]
        return `
          <div class="card p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 class="font-semibold">${f.name}</h3>
                <div class="text-xs text-zinc-500">${f.acres} ac ${f.county ? '· ' + f.county : ''} ${f.irrigation ? '· 💧 Irrigated' : ''}</div>
              </div>
              <span class="text-emerald-400 font-bold text-lg">${f.acres} ac</span>
            </div>
            ${latestTest ? `
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center text-sm mt-2">
                <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">pH</div><div class="font-bold">${latestTest.ph || '—'}</div></div>
                <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">O.M.%</div><div class="font-bold">${latestTest.organic_matter || '—'}</div></div>
                <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">P</div><div class="font-bold text-orange-400">${latestTest.p_ppm || '—'}</div></div>
                <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">K</div><div class="font-bold text-violet-400">${latestTest.k_ppm || '—'}</div></div>
                ${latestTest.s_ppm ? `<div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">S</div><div class="font-bold text-emerald-400">${latestTest.s_ppm}</div></div>` : ''}
                ${latestTest.cec ? `<div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">CEC</div><div class="font-bold">${latestTest.cec}</div></div>` : ''}
              </div>
              <div class="text-xs text-zinc-500 mt-2">Last tested: ${new Date(latestTest.test_date).toLocaleDateString()} ${latestTest.lab_name ? '· ' + latestTest.lab_name : ''}</div>
            ` : '<div class="text-xs text-amber-400 mt-2">⚠️ No soil test on file</div>'}
          </div>`
      }).join('')
      break

    case 'tests':
      if (soilTests.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No soil tests on file.</div>'; return }
      el.innerHTML = soilTests.map(t => {
        const field = fields.find(f => f.id === t.field_id)
        return `
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-semibold text-sm">${field?.name || 'Unknown'}</h3>
              <span class="text-xs text-zinc-500">${new Date(t.test_date).toLocaleDateString()}</span>
              ${t.lab_name ? `<span class="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">${t.lab_name}</span>` : ''}
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-sm">
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">pH</div><div class="font-bold">${t.ph || '—'}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">P ppm</div><div class="font-bold text-orange-400">${t.p_ppm || '—'}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">K ppm</div><div class="font-bold text-violet-400">${t.k_ppm || '—'}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">S ppm</div><div class="font-bold text-emerald-400">${t.s_ppm || '—'}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">O.M.%</div><div class="font-bold">${t.organic_matter || '—'}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">CEC</div><div class="font-bold">${t.cec || '—'}</div></div>
            </div>
          </div>`
      }).join('')
      break

    case 'plans':
      if (plans.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No application plans.</div>'; return }
      el.innerHTML = plans.map(p => {
        const splits = typeof p.splits === 'string' ? JSON.parse(p.splits) : (p.splits || [])
        const field = fields.find(f => f.id === p.field_id)
        const appliedCount = splits.filter(s => s.applied).length
        return `
          <div class="card p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 class="font-semibold text-sm">${p.plan_name}</h3>
                <div class="text-xs text-zinc-500">${field?.name || ''} · ${p.crop || ''} · ${p.crop_year}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'Active' ? 'bg-emerald-900/60 text-emerald-400' : 'bg-zinc-700 text-zinc-300'}">${p.status}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center text-sm mb-3">
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">N</div><div class="font-bold text-blue-400">${p.total_n}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">P₂O₅</div><div class="font-bold text-orange-400">${p.total_p2o5}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">K₂O</div><div class="font-bold text-violet-400">${p.total_k2o}</div></div>
              <div class="bg-zinc-800/30 rounded-lg p-2"><div class="text-xs text-zinc-500">S</div><div class="font-bold text-emerald-400">${p.total_s}</div></div>
            </div>
            <div class="space-y-1">
              ${splits.map((s, i) => `
                <div class="flex items-center gap-2 text-xs p-1.5 rounded ${s.applied ? 'bg-emerald-900/20' : ''}">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs ${s.applied ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-200'}">${s.applied ? '✓' : i + 1}</span>
                  <span class="font-medium">${s.type}</span>
                  <span class="text-zinc-500">N:${s.n} P:${s.p} K:${s.k} S:${s.s || 0}</span>
                </div>
              `).join('')}
            </div>
            <div class="mt-2 flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" style="width:${splits.length ? (appliedCount / splits.length * 100) : 0}%"></div>
              </div>
              <span class="text-xs text-zinc-500">${appliedCount}/${splits.length}</span>
            </div>
          </div>`
      }).join('')
      break

    case 'blends':
      if (blends.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No saved blends.</div>'; return }
      el.innerHTML = blends.map(b => `
        <div class="card p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-sm">${b.name}</h3>
              <div class="text-xs text-zinc-500">${b.customer_name || ''} · ${b.mode || 'dry'} · ${new Date(b.updated_at).toLocaleDateString()}</div>
            </div>
            <span class="text-xs bg-zinc-800 px-2 py-1 rounded">${b.mode === 'liquid' ? '💧 Liquid' : '🌾 Dry'}</span>
          </div>
        </div>
      `).join('')
      break

    case 'history':
      if (applications.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No application history.</div>'; return }
      el.innerHTML = `
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
                <th class="text-left px-4 py-3 font-medium">Date</th>
                <th class="text-left px-4 py-3 font-medium">Field</th>
                <th class="text-left px-4 py-3 font-medium">Type</th>
                <th class="text-right px-4 py-3 font-medium">N</th>
                <th class="text-right px-4 py-3 font-medium">P₂O₅</th>
                <th class="text-right px-4 py-3 font-medium">K₂O</th>
                <th class="text-right px-4 py-3 font-medium">$/ac</th>
              </tr></thead>
              <tbody class="text-zinc-300 divide-y divide-zinc-800">
                ${applications.map(a => {
                  const field = fields.find(f => f.id === a.field_id)
                  return `<tr class="hover:bg-zinc-800/30">
                    <td class="px-4 py-2">${new Date(a.application_date).toLocaleDateString()}</td>
                    <td class="px-4 py-2">${field?.name || '—'}</td>
                    <td class="px-4 py-2">${a.application_type}</td>
                    <td class="px-4 py-2 text-right text-blue-400">${a.n_applied}</td>
                    <td class="px-4 py-2 text-right text-orange-400">${a.p2o5_applied}</td>
                    <td class="px-4 py-2 text-right text-violet-400">${a.k2o_applied}</td>
                    <td class="px-4 py-2 text-right">$${(a.cost_per_acre || 0).toFixed(2)}</td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`
      break
  }
}
