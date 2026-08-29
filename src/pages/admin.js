import {
  listCompanies, createCompany, updateCompany, deleteCompany,
  listProfiles, updateProfile, uploadLogo,
  listBlendsForCompany, listAllBlends, deleteBlendFromDB,
  inviteUser, signOut,
  adminListUsers, adminDeleteUser, adminSendPasswordReset, adminApproveUser, adminSetUserPassword
} from '../supabase.js'
import { navigate } from '../router.js'
import { toast, friendlyError } from '../ui.js'

let companies = []
let profiles = []
let blends = []

export async function renderAdmin(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">🛠️ Admin Dashboard</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Manage companies, users, blends, and settings</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-green">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 flex-wrap">
        <button class="admin-tab admin-tab-active" data-tab="companies">Companies</button>
        <button class="admin-tab" data-tab="users">Users</button>
        <button class="admin-tab" data-tab="blends">Blends</button>
      </div>

      <!-- ══════ Companies Tab ══════ -->
      <div id="tabCompanies">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Company Tenants</h2>
          <button id="btnNewCompany" class="btn-green text-xs">+ New Company</button>
        </div>

        <!-- New company form (hidden) -->
        <div id="newCompanyForm" class="hidden card p-4 mb-4">
          <h3 class="text-sm font-semibold mb-3">Create New Company</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="lbl">Company Name</label>
              <input id="ncName" type="text" class="inp" placeholder="e.g. Prairie Ag Co-op" />
            </div>
            <div>
              <label class="lbl">Slug (URL-friendly)</label>
              <input id="ncSlug" type="text" class="inp" placeholder="e.g. prairie-ag" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="lbl">Logo</label>
              <input id="ncLogoFile" type="file" accept="image/*" class="inp text-xs" />
            </div>
            <div>
              <label class="lbl">Primary Brand Color</label>
              <div class="flex gap-2 items-center">
                <input id="ncColor" type="color" value="#059669" class="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer" />
                <input id="ncColorHex" type="text" class="inp" value="#059669" placeholder="#059669" />
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button id="btnCreateCompany" class="btn-green text-xs">Create</button>
            <button id="btnCancelCompany" class="btn-ghost text-xs">Cancel</button>
          </div>
        </div>

        <div id="companiesList" class="space-y-2"></div>
      </div>

      <!-- ══════ Users Tab ══════ -->
      <div id="tabUsers" class="hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide">All Users</h2>
          <button id="btnInviteUser" class="btn-blue text-xs">+ Invite User</button>
        </div>

        <!-- Invite form (hidden) -->
        <div id="inviteForm" class="hidden card p-4 mb-4">
          <h3 class="text-sm font-semibold mb-3">Invite New User</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label class="lbl">Full Name</label>
              <input id="invName" type="text" class="inp" placeholder="John Doe" />
            </div>
            <div>
              <label class="lbl">Email</label>
              <input id="invEmail" type="email" class="inp" placeholder="john@company.com" />
            </div>
            <div>
              <label class="lbl">Company</label>
              <select id="invCompany" class="inp"></select>
            </div>
            <div>
              <label class="lbl">Role</label>
              <select id="invRole" class="inp">
                <option value="user">User</option>
                <option value="company_admin">Company Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2">
            <button id="btnSendInvite" class="btn-blue text-xs">Send Invite</button>
            <button id="btnCancelInvite" class="btn-ghost text-xs">Cancel</button>
          </div>
        </div>

        <div id="pendingUsersSection" class="hidden mb-5">
          <h3 class="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">⏳ Pending Approval</h3>
          <div id="pendingUsersList" class="space-y-2"></div>
        </div>

        <h3 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Active Users</h3>
        <div id="usersList" class="space-y-2"></div>
      </div>

      <!-- ══════ Blends Tab ══════ -->
      <div id="tabBlends" class="hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide">All Saved Blends</h2>
          <div class="flex gap-2 items-center">
            <label class="lbl mr-1">Filter:</label>
            <select id="blendCompanyFilter" class="inp text-xs py-1 w-40"></select>
          </div>
        </div>
        <div id="blendsList" class="space-y-2"></div>
      </div>
    </div>

    <!-- Company Detail Modal -->
    <div id="companyModal" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div class="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 id="cmTitle" class="text-lg font-bold">Company Settings</h2>
          <button id="cmClose" class="btn-ghost text-xs">✕</button>
        </div>
        <div id="cmBody"></div>
      </div>
    </div>`

  // Wire navigation
  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await signOut()
    navigate('/login')
  })

  // Tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('admin-tab-active'))
      tab.classList.add('admin-tab-active')
      const target = tab.dataset.tab
      document.getElementById('tabCompanies').classList.toggle('hidden', target !== 'companies')
      document.getElementById('tabUsers').classList.toggle('hidden', target !== 'users')
      document.getElementById('tabBlends').classList.toggle('hidden', target !== 'blends')
      if (target === 'users') loadUsers()
      if (target === 'blends') loadBlends()
    })
  })

  // New company form
  document.getElementById('btnNewCompany').addEventListener('click', () => {
    document.getElementById('newCompanyForm').classList.remove('hidden')
  })
  document.getElementById('btnCancelCompany').addEventListener('click', () => {
    document.getElementById('newCompanyForm').classList.add('hidden')
  })

  // Auto-slug from name
  document.getElementById('ncName').addEventListener('input', (e) => {
    document.getElementById('ncSlug').value = e.target.value
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  })

  // Sync color picker ↔ hex
  document.getElementById('ncColor').addEventListener('input', (e) => {
    document.getElementById('ncColorHex').value = e.target.value
  })
  document.getElementById('ncColorHex').addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      document.getElementById('ncColor').value = e.target.value
    }
  })

  // Create company
  document.getElementById('btnCreateCompany').addEventListener('click', async () => {
    const name = document.getElementById('ncName').value.trim()
    const slug = document.getElementById('ncSlug').value.trim()
    if (!name || !slug) { toast('Name and slug required', 'error'); return }

    const btn = document.getElementById('btnCreateCompany')
    btn.disabled = true; btn.textContent = 'Creating...'

    try {
      let logo_url = null
      const fileInput = document.getElementById('ncLogoFile')
      if (fileInput.files[0]) {
        logo_url = await uploadLogo(fileInput.files[0], slug)
      }

      await createCompany({
        name, slug, logo_url,
        primary_color: document.getElementById('ncColorHex').value || '#059669',
      })
      toast(`"${name}" created`, 'success')
      document.getElementById('newCompanyForm').classList.add('hidden')
      document.getElementById('ncName').value = ''
      document.getElementById('ncSlug').value = ''
      document.getElementById('ncLogoFile').value = ''
      loadCompanies()
    } catch (err) {
      toast(friendlyError(err), 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Create'
    }
  })

  // Invite user form
  document.getElementById('btnInviteUser').addEventListener('click', () => {
    // Populate company dropdown
    const sel = document.getElementById('invCompany')
    sel.innerHTML = `<option value="">No company</option>` +
      companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    document.getElementById('inviteForm').classList.remove('hidden')
  })
  document.getElementById('btnCancelInvite').addEventListener('click', () => {
    document.getElementById('inviteForm').classList.add('hidden')
  })
  document.getElementById('btnSendInvite').addEventListener('click', async () => {
    const name = document.getElementById('invName').value.trim()
    const email = document.getElementById('invEmail').value.trim()
    const companyId = document.getElementById('invCompany').value || null
    const role = document.getElementById('invRole').value
    if (!name || !email) { toast('Name and email required', 'error'); return }

    const btn = document.getElementById('btnSendInvite')
    btn.disabled = true; btn.textContent = 'Creating...'
    try {
      await inviteUser(email, name, companyId, role)
      toast(`Invited ${email}`, 'success')
      document.getElementById('inviteForm').classList.add('hidden')
      document.getElementById('invName').value = ''
      document.getElementById('invEmail').value = ''
      loadUsers()
    } catch (err) {
      toast(friendlyError(err), 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Send Invite'
    }
  })

  // Company modal close
  document.getElementById('cmClose').addEventListener('click', closeCompanyModal)
  document.getElementById('companyModal').addEventListener('click', (e) => {
    if (e.target.id === 'companyModal') closeCompanyModal()
  })

  loadCompanies()
}

function closeCompanyModal() {
  document.getElementById('companyModal').classList.add('hidden')
}

// ══════════════════════════════════════════════════════════════
//  Companies
// ══════════════════════════════════════════════════════════════
async function loadCompanies() {
  try {
    companies = await listCompanies()
    const el = document.getElementById('companiesList')
    if (!el) return

    if (companies.length === 0) {
      el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No companies yet. Create one to get started.</div>'
      return
    }

    el.innerHTML = companies.map(c => `
      <div class="card p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0 cursor-pointer open-company" data-id="${c.id}">
          ${c.logo_url
            ? `<img src="${c.logo_url}" class="h-10 w-10 rounded-lg object-contain bg-zinc-800 p-1" />`
            : `<div class="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold text-white" style="background:${c.primary_color || '#059669'}">${c.name[0]}</div>`
          }
          <div class="min-w-0">
            <div class="font-semibold text-sm">${c.name}</div>
            <div class="text-xs text-zinc-500">
              /${c.slug} · ${c.active ? '🟢 Active' : '🔴 Inactive'}
              ${c.primary_color ? ` · <span class="inline-block w-3 h-3 rounded-full align-middle" style="background:${c.primary_color}"></span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="btn-ghost text-xs open-company" data-id="${c.id}">⚙️ Settings</button>
          <button class="btn-ghost text-xs toggle-company" data-id="${c.id}" data-active="${c.active}">
            ${c.active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-red text-xs delete-company" data-id="${c.id}" data-name="${c.name}">Delete</button>
        </div>
      </div>`
    ).join('')

    // Wire events
    el.querySelectorAll('.open-company').forEach(btn => {
      btn.addEventListener('click', () => openCompanySettings(btn.dataset.id))
    })
    el.querySelectorAll('.toggle-company').forEach(btn => {
      btn.addEventListener('click', async () => {
        const active = btn.dataset.active === 'true'
        await updateCompany(btn.dataset.id, { active: !active })
        toast(active ? 'Company deactivated' : 'Company activated', 'info')
        loadCompanies()
      })
    })
    el.querySelectorAll('.delete-company').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.name}"? This removes all their blends and user assignments.`)) return
        await deleteCompany(btn.dataset.id)
        toast('Company deleted', 'info')
        loadCompanies()
      })
    })
  } catch (err) {
    toast('Failed to load companies: ' + err.message, 'error')
  }
}

// ── Company Settings Modal ──
async function openCompanySettings(companyId) {
  const c = companies.find(co => co.id === companyId)
  if (!c) return

  // Load company users and blends
  let companyUsers = []
  let companyBlends = []
  try {
    const allProfiles = await listProfiles()
    companyUsers = allProfiles.filter(p => p.company_id === companyId)
    companyBlends = await listBlendsForCompany(companyId)
  } catch (err) { /* ignore */ }

  document.getElementById('cmTitle').textContent = c.name + ' Settings'
  const body = document.getElementById('cmBody')

  const toolsDef = [
    { key: 'crops',         label: '🌿 Crop Library' },
    { key: 'fields',        label: '🗺️ Fields' },
    { key: 'soil-tests',    label: '🧪 Soil Tests' },
    { key: 'planner',       label: '📅 App Planner' },
    { key: 'inventory',     label: '📦 Inventory' },
    { key: 'spreader',      label: '⚙️ Spreader Cal' },
    { key: 'weather',       label: '🌤️ Weather' },
    { key: 'vrt',           label: '🗺️ VRT Rx' },
    { key: 'nutrient-plan', label: '📋 4R Plan' },
    { key: 'grower',        label: '👤 Grower Portal' },
  ]
  const toolTogglesHtml = toolsDef.map(t => {
    const enabled = !c.enabled_tools || (Array.isArray(c.enabled_tools) && c.enabled_tools.includes(t.key))
    return '<label class="flex items-center gap-2 px-3 py-2 bg-zinc-800/30 rounded-lg cursor-pointer hover:bg-zinc-800/50">' +
      '<input type="checkbox" class="cm-tool-toggle w-4 h-4 accent-emerald-500" data-tool="' + t.key + '" ' + (enabled ? 'checked' : '') + ' />' +
      '<span class="text-sm">' + t.label + '</span>' +
      '</label>'
  }).join('')

  body.innerHTML = `
    <!-- Branding -->
    <div class="mb-5">
      <h3 class="lbl mb-2">Branding</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="lbl">Company Name</label>
          <input id="cmName" type="text" class="inp" value="${c.name}" />
        </div>
        <div>
          <label class="lbl">Slug</label>
          <input id="cmSlug" type="text" class="inp" value="${c.slug}" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label class="lbl">Logo</label>
          ${c.logo_url ? `<img src="${c.logo_url}" class="h-12 w-auto rounded-lg bg-zinc-800 p-1 mb-2" />` : ''}
          <input id="cmLogoFile" type="file" accept="image/*" class="inp text-xs" />
        </div>
        <div>
          <label class="lbl">Primary Color</label>
          <div class="flex gap-2 items-center">
            <input id="cmColor" type="color" value="${c.primary_color || '#059669'}" class="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer" />
            <input id="cmColorHex" type="text" class="inp" value="${c.primary_color || '#059669'}" />
          </div>
        </div>
      </div>
    </div>

    <!-- Product Visibility -->
    <div class="mb-5">
      <h3 class="lbl mb-2">📦 Product Visibility</h3>
      <p class="text-xs text-zinc-500 mb-2">Toggle which products are available in the calculator for this company</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Dry Products</div>
          <div class="space-y-1">
            ${renderProductToggles(c.enabled_products, 'dry')}
          </div>
        </div>
        <div>
          <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Liquid Products</div>
          <div class="space-y-1">
            ${renderProductToggles(c.enabled_products, 'liquid')}
          </div>
        </div>
      </div>
    </div>

    <!-- Default Prices -->
    <div class="mb-5">
      <h3 class="lbl mb-2">Default Product Prices ($/ton)</h3>
      <p class="text-xs text-zinc-500 mb-2">Override default prices for this company's calculator</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${renderPriceInputs(c.default_prices)}
      </div>
    </div>

    <!-- Nitrogen Stabilizer -->
    <div class="mb-5">
      <h3 class="lbl mb-2">🧪 Nitrogen Stabilizer (Liquid Mode)</h3>
      <p class="text-xs text-zinc-500 mb-2">Used when the N Stabilizer checkbox is enabled on the liquid calculator</p>
      <div class="mb-2">
        <label class="lbl">Chemical Name</label>
        <input id="cmStabName" type="text" class="inp"
               placeholder="e.g. Instinct II" value="${c.default_prices?.stabilizer_name ?? ''}" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="lbl">Rate (oz/ton of liquid)</label>
          <input id="cmStabRate" type="number" step="0.1" min="0" class="inp"
                 placeholder="e.g. 64" value="${c.default_prices?.stabilizer_rate ?? ''}" />
        </div>
        <div>
          <label class="lbl">Price ($/gal)</label>
          <input id="cmStabPrice" type="number" step="0.01" min="0" class="inp"
                 placeholder="e.g. 48.00" value="${c.default_prices?.stabilizer_price ?? ''}" />
        </div>
      </div>
    </div>

    <!-- Chemical Additive (Dry Mode) -->
    <div class="mb-5">
      <h3 class="lbl mb-2">🧪 Chemical Additive (Dry Mode)</h3>
      <p class="text-xs text-zinc-500 mb-2">Used when the Chemical Additive checkbox is enabled on the dry calculator</p>
      <div class="mb-2">
        <label class="lbl">Chemical Name</label>
        <input id="cmDryChemName" type="text" class="inp"
               placeholder="e.g. Agrotain" value="${c.default_prices?.dry_chemical_name ?? ''}" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="lbl">Rate (oz/ton of dry)</label>
          <input id="cmDryChemRate" type="number" step="0.1" min="0" class="inp"
                 placeholder="e.g. 32" value="${c.default_prices?.dry_chemical_rate ?? ''}" />
        </div>
        <div>
          <label class="lbl">Price ($/gal)</label>
          <input id="cmDryChemPrice" type="number" step="0.01" min="0" class="inp"
                 placeholder="e.g. 24.00" value="${c.default_prices?.dry_chemical_price ?? ''}" />
        </div>
      </div>
    </div>

    <!-- Tool Access -->
    <div class="mb-5">
      <h3 class="lbl mb-2">🔧 Tool Access</h3>
      <p class="text-xs text-zinc-500 mb-2">Select which tools this company's users can access</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${toolTogglesHtml}
      </div>
    </div>

    <!-- Stats -->
    <div class="mb-5">
      <h3 class="lbl mb-2">Overview</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-center">
          <div class="text-2xl font-bold">${companyUsers.length}</div>
          <div class="text-xs text-zinc-500">Users</div>
        </div>
        <div class="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-center">
          <div class="text-2xl font-bold">${companyBlends.length}</div>
          <div class="text-xs text-zinc-500">Blends</div>
        </div>
        <div class="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-center">
          <div class="text-2xl font-bold">${c.active ? '🟢' : '🔴'}</div>
          <div class="text-xs text-zinc-500">${c.active ? 'Active' : 'Inactive'}</div>
        </div>
      </div>
    </div>

    <!-- Users list -->
    ${companyUsers.length > 0 ? `
    <div class="mb-5">
      <h3 class="lbl mb-2">Users (${companyUsers.length})</h3>
      <div class="space-y-1">
        ${companyUsers.map(u => `
          <div class="flex items-center justify-between px-3 py-2 bg-zinc-800/30 rounded-lg">
            <div>
              <span class="text-sm font-medium">${u.full_name || 'Unnamed'}</span>
              <span class="text-xs text-zinc-500 ml-2">${u.role}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- Recent blends -->
    ${companyBlends.length > 0 ? `
    <div class="mb-5">
      <h3 class="lbl mb-2">Recent Blends (${companyBlends.length})</h3>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        ${companyBlends.slice(0, 10).map(b => `
          <div class="flex items-center justify-between px-3 py-2 bg-zinc-800/30 rounded-lg">
            <div>
              <span class="text-sm font-medium">${b.name || 'Unnamed blend'}</span>
              <span class="text-xs text-zinc-500 ml-2">${b.customer_name || ''} · ${b.mode}</span>
            </div>
            <div class="text-xs text-zinc-500">${new Date(b.updated_at).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="flex gap-2">
      <button id="cmSave" class="btn-green">Save Changes</button>
      <button id="cmCancel" class="btn-ghost">Cancel</button>
    </div>`

  // Sync color
  const cmColor = body.querySelector('#cmColor')
  const cmColorHex = body.querySelector('#cmColorHex')
  cmColor.addEventListener('input', () => { cmColorHex.value = cmColor.value })
  cmColorHex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(cmColorHex.value)) cmColor.value = cmColorHex.value
  })

  // Save
  body.querySelector('#cmSave').addEventListener('click', async () => {
    const btn = body.querySelector('#cmSave')
    btn.disabled = true; btn.textContent = 'Saving...'
    try {
      const gatheredPrices = gatherPrices(body) || {}
      const stabName = body.querySelector('#cmStabName').value.trim()
      const stabRate = parseFloat(body.querySelector('#cmStabRate').value)
      const stabPrice = parseFloat(body.querySelector('#cmStabPrice').value)
      if (stabName) gatheredPrices.stabilizer_name = stabName
      if (!isNaN(stabRate) && stabRate >= 0) gatheredPrices.stabilizer_rate = stabRate
      if (!isNaN(stabPrice) && stabPrice >= 0) gatheredPrices.stabilizer_price = stabPrice
      const dryChemName = body.querySelector('#cmDryChemName').value.trim()
      const dryChemRate = parseFloat(body.querySelector('#cmDryChemRate').value)
      const dryChemPrice = parseFloat(body.querySelector('#cmDryChemPrice').value)
      if (dryChemName) gatheredPrices.dry_chemical_name = dryChemName
      if (!isNaN(dryChemRate) && dryChemRate >= 0) gatheredPrices.dry_chemical_rate = dryChemRate
      if (!isNaN(dryChemPrice) && dryChemPrice >= 0) gatheredPrices.dry_chemical_price = dryChemPrice
      const enabledTools = [...body.querySelectorAll('.cm-tool-toggle:checked')].map(cb => cb.dataset.tool)
      const enabledProducts = [...body.querySelectorAll('.cm-product-toggle:checked')].map(cb => cb.dataset.product)
      const updates = {
        name: body.querySelector('#cmName').value.trim(),
        slug: body.querySelector('#cmSlug').value.trim(),
        primary_color: cmColorHex.value,
        default_prices: Object.keys(gatheredPrices).length > 0 ? gatheredPrices : null,
        enabled_tools: enabledTools,
        enabled_products: enabledProducts,
      }

      const fileInput = body.querySelector('#cmLogoFile')
      if (fileInput.files[0]) {
        updates.logo_url = await uploadLogo(fileInput.files[0], updates.slug || c.slug)
      }

      await updateCompany(companyId, updates)
      toast('Company updated', 'success')
      closeCompanyModal()
      loadCompanies()
    } catch (err) {
      toast(friendlyError(err), 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes'
    }
  })

  body.querySelector('#cmCancel').addEventListener('click', closeCompanyModal)

  document.getElementById('companyModal').classList.remove('hidden')
}

// ── Price inputs for default_prices ──
const ALL_PRODUCTS = {
  an:     { name: 'Nitrate (AN)',     default: 650, type: 'dry' },
  urea:   { name: 'Urea',            default: 580, type: 'dry' },
  map:    { name: 'MAP',              default: 720, type: 'dry' },
  potash: { name: 'Potash',           default: 380, type: 'dry' },
  ams:    { name: 'AMS',              default: 420, type: 'dry' },
  gypsum: { name: 'Gypsum',           default: 180, type: 'dry' },
  uan32:  { name: 'UAN 32',           default: 300, type: 'liquid' },
  uan28:  { name: 'UAN 28',           default: 260, type: 'liquid' },
  app:    { name: '10-34-0 (APP)',     default: 480, type: 'liquid' },
  ats:    { name: 'ATS',              default: 320, type: 'liquid' },
  kts:    { name: 'KTS',              default: 380, type: 'liquid' },
}

function renderProductToggles(enabledProducts, type) {
  const allKeys = Object.keys(ALL_PRODUCTS)
  return Object.entries(ALL_PRODUCTS)
    .filter(([, prod]) => prod.type === type)
    .map(([key, prod]) => {
      const enabled = !enabledProducts || (Array.isArray(enabledProducts) && enabledProducts.includes(key)) || !Array.isArray(enabledProducts)
      return '<label class="flex items-center gap-2 px-3 py-2 bg-zinc-800/30 rounded-lg cursor-pointer hover:bg-zinc-800/50">' +
        '<input type="checkbox" class="cm-product-toggle w-4 h-4 accent-emerald-500" data-product="' + key + '" ' + (enabled ? 'checked' : '') + ' />' +
        '<span class="text-sm">' + prod.name + '</span>' +
        '</label>'
    }).join('')
}

function renderPriceInputs(prices) {
  return Object.entries(ALL_PRODUCTS).map(([key, prod]) => {
    const val = prices?.[key] ?? ''
    return `
      <div>
        <label class="lbl">${prod.name}</label>
        <input type="number" class="inp text-xs price-input" data-key="${key}"
               placeholder="${prod.default}" value="${val}" step="1" />
      </div>`
  }).join('')
}

function gatherPrices(container) {
  const prices = {}
  container.querySelectorAll('.price-input').forEach(inp => {
    const val = parseFloat(inp.value)
    if (!isNaN(val) && val > 0) prices[inp.dataset.key] = val
  })
  return Object.keys(prices).length > 0 ? prices : null
}

// ══════════════════════════════════════════════════════════════
//  Users
// ══════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    const el = document.getElementById('usersList')
    const pendingEl = document.getElementById('pendingUsersList')
    const pendingSection = document.getElementById('pendingUsersSection')
    if (!el) return
    el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">Loading...</div>'

    profiles = await listProfiles()

    const pendingProfiles = profiles.filter(p => p.approved === false)
    const approvedProfiles = profiles.filter(p => p.approved !== false)

    // Update tab badge
    const usersTab = document.querySelector('[data-tab="users"]')
    if (usersTab) {
      usersTab.textContent = pendingProfiles.length > 0 ? 'Users (' + pendingProfiles.length + ' pending)' : 'Users'
    }

    // Render pending users
    if (pendingProfiles.length > 0 && pendingEl && pendingSection) {
      pendingSection.classList.remove('hidden')
      pendingEl.innerHTML = pendingProfiles.map(p => {
        const email = p.email || ''
        const signedUp = new Date(p.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
        return '<div class="card p-4 border border-amber-800/40 flex items-center justify-between gap-4 flex-wrap">' +
          '<div class="min-w-0 flex-1">' +
          '<div class="font-semibold text-sm">' + (p.full_name || 'Unnamed') + '</div>' +
          '<div class="text-xs text-zinc-400 mt-0.5">' + email + '</div>' +
          '<div class="text-xs text-zinc-600 mt-1">Signed up: ' + signedUp + '</div>' +
          '</div>' +
          '<div class="flex gap-2 shrink-0">' +
          '<button class="btn-green text-xs approve-user" data-user-id="' + p.user_id + '" data-name="' + (p.full_name || email) + '">✓ Approve</button>' +
          '<button class="btn-red text-xs deny-user" data-user-id="' + p.user_id + '" data-name="' + (p.full_name || email) + '">✕ Deny</button>' +
          '</div></div>'
      }).join('')

      // Wire approve buttons
      pendingEl.querySelectorAll('.approve-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = 'Approving...'
          try {
            await adminApproveUser(btn.dataset.userId)
            toast(btn.dataset.name + ' approved — notification email sent', 'success')
            loadUsers()
          } catch (err) {
            toast(friendlyError(err), 'error')
            btn.disabled = false; btn.textContent = '✓ Approve'
          }
        })
      })

      // Wire deny buttons
      pendingEl.querySelectorAll('.deny-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Deny and delete "' + btn.dataset.name + '"? This cannot be undone.')) return
          btn.disabled = true; btn.textContent = 'Denying...'
          try {
            await adminDeleteUser(btn.dataset.userId)
            toast(btn.dataset.name + ' denied and removed', 'info')
            loadUsers()
          } catch (err) {
            toast(friendlyError(err), 'error')
            btn.disabled = false; btn.textContent = '✕ Deny'
          }
        })
      })
    } else if (pendingSection) {
      pendingSection.classList.add('hidden')
    }

    // Render approved users
    if (approvedProfiles.length === 0) {
      el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No active users yet.</div>'
      return
    }

    el.innerHTML = approvedProfiles.map(p => {
      const email = p.email || ''

      return `
      <div class="card p-4 flex items-start justify-between gap-4 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${p.full_name || 'Unnamed'}</div>
          <div class="text-xs text-zinc-400 mt-0.5">${email || '<em class="text-zinc-600">no email</em>'}</div>
          <div class="flex flex-wrap gap-1.5 mt-1.5 items-center">
            <span class="inline-block px-1.5 py-0.5 rounded text-xs font-medium
              ${p.role === 'super_admin' ? 'bg-amber-900/60 text-amber-400' :
                p.role === 'company_admin' ? 'bg-blue-900/60 text-blue-400' :
                'bg-zinc-700 text-zinc-300'}">${p.role}</span>
            <span class="text-zinc-600 text-xs">${p.companies?.name || 'No company'}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0 items-center">
          <select class="inp text-xs py-1 w-28 assign-company" data-profile-id="${p.id}">
            <option value="">No company</option>
            ${companies.map(c => `<option value="${c.id}" ${p.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          <select class="inp text-xs py-1 w-32 assign-role" data-profile-id="${p.id}">
            <option value="user" ${p.role === 'user' ? 'selected' : ''}>User</option>
            <option value="company_admin" ${p.role === 'company_admin' ? 'selected' : ''}>Company Admin</option>
            <option value="super_admin" ${p.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
          ${email ? `<button class="btn-ghost text-xs reset-pw" data-email="${email}" data-name="${p.full_name || email}">Reset Link</button>` : ''}
          <button class="btn-blue text-xs set-pw" data-user-id="${p.user_id}" data-name="${p.full_name || email || 'this user'}">Set Password</button>
          <button class="btn-red text-xs delete-user" data-user-id="${p.user_id}" data-name="${p.full_name || email || 'this user'}">Delete</button>
        </div>
      </div>`
    }).join('')

    // Wire company/role assignment
    el.querySelectorAll('.assign-company').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateProfile(sel.dataset.profileId, { company_id: sel.value || null })
          toast('Company updated', 'success')
        } catch (err) { toast(friendlyError(err), 'error') }
      })
    })
    el.querySelectorAll('.assign-role').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateProfile(sel.dataset.profileId, { role: sel.value })
          toast('Role updated', 'success')
        } catch (err) { toast(friendlyError(err), 'error') }
      })
    })

    // Reset password - generates recovery link for admin to share
    el.querySelectorAll('.reset-pw').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Generate a password reset link for ${btn.dataset.name}?\n\nThe link will be shown for you to copy and share with the user (via text, Slack, etc.)`)) return
        btn.disabled = true; btn.textContent = 'Generating...'
        try {
          const res = await adminSendPasswordReset(btn.dataset.email)
          if (res.action_link) {
            // Copy to clipboard automatically
            try { await navigator.clipboard.writeText(res.action_link) } catch (_) {}
            prompt(`Password reset link for ${btn.dataset.email}\n(Already copied to clipboard - share with the user)`, res.action_link)
          } else {
            toast('Link generated but empty response', 'error')
          }
        } catch (err) {
          toast(friendlyError(err), 'error')
        } finally {
          btn.disabled = false; btn.textContent = 'Reset Link'
        }
      })
    })

    // Set password directly
    el.querySelectorAll('.set-pw').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newPw = prompt(`Set a new password for ${btn.dataset.name}\n\nMinimum 6 characters. Share this password with the user via a secure channel.`)
        if (!newPw) return
        if (newPw.length < 6) { toast('Password must be at least 6 characters', 'error'); return }
        btn.disabled = true; btn.textContent = 'Setting...'
        try {
          await adminSetUserPassword(btn.dataset.userId, newPw)
          toast(`Password set for ${btn.dataset.name}`, 'success')
        } catch (err) {
          toast(friendlyError(err), 'error')
        } finally {
          btn.disabled = false; btn.textContent = 'Set Password'
        }
      })
    })

    // Delete user
    el.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete "${btn.dataset.name}"? This cannot be undone.`)) return
        btn.disabled = true; btn.textContent = 'Deleting...'
        try {
          await adminDeleteUser(btn.dataset.userId)
          toast('User deleted', 'info')
          loadUsers()
        } catch (err) {
          toast(friendlyError(err), 'error')
          btn.disabled = false; btn.textContent = 'Delete'
        }
      })
    })
  } catch (err) {
    toast('Failed to load users: ' + err.message, 'error')
  }
}

// ══════════════════════════════════════════════════════════════
//  Blends
// ══════════════════════════════════════════════════════════════
async function loadBlends(filterCompanyId) {
  try {
    blends = await listAllBlends()

    // Populate filter dropdown
    const filter = document.getElementById('blendCompanyFilter')
    if (filter && filter.options.length <= 1) {
      filter.innerHTML = `<option value="">All Companies</option>` +
        companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
      filter.addEventListener('change', () => loadBlends(filter.value || null))
    }

    const filtered = filterCompanyId
      ? blends.filter(b => b.company_id === filterCompanyId)
      : blends

    const el = document.getElementById('blendsList')
    if (!el) return

    if (filtered.length === 0) {
      el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No blends found.</div>'
      return
    }

    el.innerHTML = filtered.map(b => {
      const data = b.data || {}
      const costPerAcre = data.costPerAcre ? `$${parseFloat(data.costPerAcre).toFixed(2)}/ac` : ''
      return `
        <div class="card p-4 flex items-center justify-between gap-4 flex-wrap">
          <div class="min-w-0">
            <div class="font-semibold text-sm">${b.name || 'Unnamed blend'}</div>
            <div class="text-xs text-zinc-500">
              ${b.companies?.name || 'Unknown'} ·
              <span class="px-1.5 py-0.5 rounded text-xs font-medium ${b.mode === 'dry' ? 'bg-amber-900/60 text-amber-400' : 'bg-blue-900/60 text-blue-400'}">${b.mode}</span>
              ${b.customer_name ? ` · ${b.customer_name}` : ''}
              ${costPerAcre ? ` · ${costPerAcre}` : ''}
            </div>
          </div>
          <div class="flex gap-2 shrink-0 items-center">
            <div class="text-xs text-zinc-500">${new Date(b.updated_at).toLocaleDateString()}</div>
            <button class="btn-red text-xs delete-blend" data-id="${b.id}" data-name="${b.name || 'this blend'}">Delete</button>
          </div>
        </div>`
    }).join('')

    el.querySelectorAll('.delete-blend').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.name}"?`)) return
        try {
          await deleteBlendFromDB(btn.dataset.id)
          toast('Blend deleted', 'info')
          loadBlends(filterCompanyId)
        } catch (err) {
          toast(friendlyError(err), 'error')
        }
      })
    })
  } catch (err) {
    toast('Failed to load blends: ' + err.message, 'error')
  }
}
