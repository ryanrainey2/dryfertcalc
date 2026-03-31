import { listCompanies, createCompany, updateCompany, deleteCompany, listProfiles, updateProfile, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let companies = []
let profiles = []

export async function renderAdmin(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">🛠️ Admin Dashboard</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Manage companies, users, and deployments</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-green">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5">
        <button class="admin-tab admin-tab-active" data-tab="companies">Companies</button>
        <button class="admin-tab" data-tab="users">Users</button>
      </div>

      <!-- Companies Tab -->
      <div id="tabCompanies">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Company Tenants</h2>
          <button id="btnNewCompany" class="btn-green text-xs">+ New Company</button>
        </div>

        <!-- New company form (hidden) -->
        <div id="newCompanyForm" class="hidden card p-4 mb-4">
          <h3 class="text-sm font-semibold mb-3">Create New Company</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="lbl">Company Name</label>
              <input id="ncName" type="text" class="inp" placeholder="e.g. Prairie Ag Co-op" />
            </div>
            <div>
              <label class="lbl">Slug (URL-friendly)</label>
              <input id="ncSlug" type="text" class="inp" placeholder="e.g. prairie-ag" />
            </div>
            <div>
              <label class="lbl">Logo URL</label>
              <input id="ncLogo" type="text" class="inp" placeholder="https://..." />
            </div>
          </div>
          <div class="flex gap-2">
            <button id="btnCreateCompany" class="btn-green text-xs">Create</button>
            <button id="btnCancelCompany" class="btn-ghost text-xs">Cancel</button>
          </div>
        </div>

        <div id="companiesList" class="space-y-2"></div>
      </div>

      <!-- Users Tab -->
      <div id="tabUsers" class="hidden">
        <h2 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">All Users</h2>
        <div id="usersList" class="space-y-2"></div>
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
      if (target === 'users') loadUsers()
    })
  })

  // New company form toggle
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

  // Create company
  document.getElementById('btnCreateCompany').addEventListener('click', async () => {
    const name = document.getElementById('ncName').value.trim()
    const slug = document.getElementById('ncSlug').value.trim()
    if (!name || !slug) { toast('Name and slug required', 'error'); return }
    try {
      await createCompany({
        name, slug,
        logo_url: document.getElementById('ncLogo').value.trim() || null,
      })
      toast(`"${name}" created`, 'success')
      document.getElementById('newCompanyForm').classList.add('hidden')
      document.getElementById('ncName').value = ''
      document.getElementById('ncSlug').value = ''
      document.getElementById('ncLogo').value = ''
      loadCompanies()
    } catch (err) {
      toast(err.message, 'error')
    }
  })

  loadCompanies()
}

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
        <div class="flex items-center gap-3 min-w-0">
          ${c.logo_url
            ? `<img src="${c.logo_url}" class="h-8 w-8 rounded-lg object-contain bg-zinc-800 p-1" />`
            : `<div class="h-8 w-8 rounded-lg bg-zinc-700 flex items-center justify-center text-xs font-bold">${c.name[0]}</div>`
          }
          <div class="min-w-0">
            <div class="font-semibold text-sm">${c.name}</div>
            <div class="text-xs text-zinc-500">/${c.slug} · ${c.active ? '🟢 Active' : '🔴 Inactive'}</div>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="btn-ghost text-xs toggle-company" data-id="${c.id}" data-active="${c.active}">
            ${c.active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-red text-xs delete-company" data-id="${c.id}" data-name="${c.name}">Delete</button>
        </div>
      </div>`
    ).join('')

    // Wire toggle/delete
    el.querySelectorAll('.toggle-company').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        const active = btn.dataset.active === 'true'
        await updateCompany(id, { active: !active })
        toast(active ? 'Company deactivated' : 'Company activated', 'info')
        loadCompanies()
      })
    })
    el.querySelectorAll('.delete-company').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete "${btn.dataset.name}"? This removes all their blends.`)) return
        await deleteCompany(btn.dataset.id)
        toast('Company deleted', 'info')
        loadCompanies()
      })
    })
  } catch (err) {
    toast('Failed to load companies: ' + err.message, 'error')
  }
}

async function loadUsers() {
  try {
    profiles = await listProfiles()
    const el = document.getElementById('usersList')
    if (!el) return

    if (profiles.length === 0) {
      el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No users yet.</div>'
      return
    }

    el.innerHTML = profiles.map(p => `
      <div class="card p-4 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="font-semibold text-sm">${p.full_name || 'Unnamed'}</div>
          <div class="text-xs text-zinc-500">
            ${p.companies?.name || 'No company'} ·
            <span class="px-1.5 py-0.5 rounded text-xs font-medium
              ${p.role === 'super_admin' ? 'bg-amber-900/60 text-amber-400' :
                p.role === 'company_admin' ? 'bg-blue-900/60 text-blue-400' :
                'bg-zinc-700 text-zinc-300'}">${p.role}</span>
          </div>
        </div>
        <div class="flex gap-2 shrink-0 items-center">
          <select class="inp text-xs py-1 w-28 assign-company" data-profile-id="${p.id}">
            <option value="">No company</option>
            ${companies.map(c => `<option value="${c.id}" ${p.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          <select class="inp text-xs py-1 w-32 assign-role" data-profile-id="${p.id}">
            <option value="user" ${p.role === 'user' ? 'selected' : ''}>User</option>
            <option value="company_admin" ${p.role === 'company_admin' ? 'selected' : ''}>Company Admin</option>
            <option value="super_admin" ${p.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
        </div>
      </div>`
    ).join('')

    // Wire company/role assignment
    el.querySelectorAll('.assign-company').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateProfile(sel.dataset.profileId, { company_id: sel.value || null })
          toast('Company updated', 'success')
        } catch (err) { toast(err.message, 'error') }
      })
    })
    el.querySelectorAll('.assign-role').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateProfile(sel.dataset.profileId, { role: sel.value })
          toast('Role updated', 'success')
        } catch (err) { toast(err.message, 'error') }
      })
    })
  } catch (err) {
    toast('Failed to load users: ' + err.message, 'error')
  }
}
