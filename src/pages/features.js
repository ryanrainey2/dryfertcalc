import {
  listFeatureRequests, createFeatureRequest,
  updateFeatureRequest, deleteFeatureRequest, signOut
} from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

const CATEGORIES = ['General', 'Calculator', 'Blends', 'Reports', 'Admin', 'Integrations', 'UI/UX', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Approved', 'In Progress', 'Completed', 'Declined']

const STATUS_COLORS = {
  'Approved':    'bg-blue-900/60 text-blue-400',
  'In Progress': 'bg-amber-900/60 text-amber-400',
  'Completed':   'bg-emerald-900/60 text-emerald-400',
  'Declined':    'bg-red-900/60 text-red-400',
}

const PRIORITY_COLORS = {
  'Low':      'text-zinc-500',
  'Medium':   'text-zinc-300',
  'High':     'text-orange-400',
  'Critical': 'text-red-400',
}

let requests = []
let filterStatus = ''

export async function renderFeatures(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">📋 Feature Tracker</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Submit and track feature requests</p>
        </div>
        <div class="flex gap-2">
          <button id="btnNewFeature" class="btn-green">+ New Request</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnGoAdmin" class="btn-ghost">🛠️ Admin</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="card p-3 text-center">
          <div id="statTotal" class="text-2xl font-bold">0</div>
          <div class="text-xs text-zinc-500">Total</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statApproved" class="text-2xl font-bold text-blue-400">0</div>
          <div class="text-xs text-zinc-500">Approved</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statInProgress" class="text-2xl font-bold text-amber-400">0</div>
          <div class="text-xs text-zinc-500">In Progress</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statCompleted" class="text-2xl font-bold text-emerald-400">0</div>
          <div class="text-xs text-zinc-500">Completed</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-2 mb-5 flex-wrap">
        <button class="mode-btn mode-btn-active filter-btn" data-status="">All</button>
        <button class="mode-btn filter-btn" data-status="Approved">Approved</button>
        <button class="mode-btn filter-btn" data-status="In Progress">In Progress</button>
        <button class="mode-btn filter-btn" data-status="Completed">Completed</button>
        <button class="mode-btn filter-btn" data-status="Declined">Declined</button>
      </div>

      <!-- New Request Form (hidden) -->
      <div id="newFeatureForm" class="hidden card p-5 mb-5">
        <h3 class="text-sm font-semibold mb-3">New Feature Request</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="lbl">Title</label>
            <input id="frTitle" type="text" class="inp" placeholder="Brief feature title" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="lbl">Category</label>
              <select id="frCategory" class="inp">
                ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="lbl">Priority</label>
              <select id="frPriority" class="inp">
                ${PRIORITIES.map(p => `<option value="${p}" ${p === 'Medium' ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label class="lbl">Description</label>
          <textarea id="frDesc" rows="3" class="inp resize-y" placeholder="Describe the feature in detail..."></textarea>
        </div>
        <div class="flex gap-2">
          <button id="btnSubmitFeature" class="btn-green">Submit (Auto-Approved)</button>
          <button id="btnCancelFeature" class="btn-ghost">Cancel</button>
        </div>
      </div>

      <!-- Requests List -->
      <div id="featuresList" class="space-y-3"></div>
    </div>

    <!-- Edit Modal -->
    <div id="editFeatureModal" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div class="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">Edit Feature Request</h2>
          <button id="efClose" class="btn-ghost text-xs">✕</button>
        </div>
        <div id="editFeatureBody"></div>
      </div>
    </div>`

  // Navigation
  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnGoAdmin').addEventListener('click', () => navigate('/admin'))
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await signOut()
    navigate('/login')
  })

  // New feature form toggle
  document.getElementById('btnNewFeature').addEventListener('click', () => {
    document.getElementById('newFeatureForm').classList.remove('hidden')
  })
  document.getElementById('btnCancelFeature').addEventListener('click', () => {
    document.getElementById('newFeatureForm').classList.add('hidden')
  })

  // Submit feature
  document.getElementById('btnSubmitFeature').addEventListener('click', async () => {
    const title = document.getElementById('frTitle').value.trim()
    if (!title) { toast('Title is required', 'error'); return }

    const btn = document.getElementById('btnSubmitFeature')
    btn.disabled = true; btn.textContent = 'Submitting...'
    try {
      await createFeatureRequest({
        title,
        description: document.getElementById('frDesc').value.trim() || null,
        category: document.getElementById('frCategory').value,
        priority: document.getElementById('frPriority').value,
        requested_by_name: profile.full_name || 'Admin',
      })
      toast('Feature request submitted and auto-approved', 'success')
      document.getElementById('newFeatureForm').classList.add('hidden')
      document.getElementById('frTitle').value = ''
      document.getElementById('frDesc').value = ''
      document.getElementById('frCategory').value = 'General'
      document.getElementById('frPriority').value = 'Medium'
      loadFeatures()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Submit (Auto-Approved)'
    }
  })

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('mode-btn-active'))
      btn.classList.add('mode-btn-active')
      filterStatus = btn.dataset.status
      renderList()
    })
  })

  // Modal close
  document.getElementById('efClose').addEventListener('click', closeEditModal)
  document.getElementById('editFeatureModal').addEventListener('click', (e) => {
    if (e.target.id === 'editFeatureModal') closeEditModal()
  })

  loadFeatures()
}

function closeEditModal() {
  document.getElementById('editFeatureModal').classList.add('hidden')
}

async function loadFeatures() {
  try {
    requests = await listFeatureRequests()
    updateStats()
    renderList()
  } catch (err) {
    toast('Failed to load features: ' + err.message, 'error')
  }
}

function updateStats() {
  const el = (id) => document.getElementById(id)
  el('statTotal').textContent = requests.length
  el('statApproved').textContent = requests.filter(r => r.status === 'Approved').length
  el('statInProgress').textContent = requests.filter(r => r.status === 'In Progress').length
  el('statCompleted').textContent = requests.filter(r => r.status === 'Completed').length
}

function renderList() {
  const el = document.getElementById('featuresList')
  if (!el) return

  const filtered = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests

  if (filtered.length === 0) {
    el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No feature requests found.</div>'
    return
  }

  el.innerHTML = filtered.map(r => {
    const statusClass = STATUS_COLORS[r.status] || 'bg-zinc-700 text-zinc-300'
    const priorityClass = PRIORITY_COLORS[r.priority] || 'text-zinc-300'
    const isInProgress = r.status === 'In Progress'
    const isCompleted = r.status === 'Completed'

    return `
      <div class="card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h3 class="font-semibold text-sm">${r.title}</h3>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass} ${isInProgress ? 'animate-pulse' : ''}">${r.status}</span>
              <span class="text-xs ${priorityClass} font-medium">${r.priority}</span>
              <span class="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">${r.category}</span>
            </div>
            ${r.description ? `<p class="text-sm text-zinc-400 mt-1 line-clamp-2">${r.description}</p>` : ''}
            ${r.admin_notes ? `<div class="mt-2 text-xs text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2"><strong>Notes:</strong> ${r.admin_notes}</div>` : ''}
            ${r.progress_log && isInProgress ? `<div class="mt-2 text-xs text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 max-h-24 overflow-y-auto whitespace-pre-line"><strong>Progress:</strong>\n${r.progress_log}</div>` : ''}
            <div class="text-xs text-zinc-600 mt-2">
              ${r.requested_by_name || 'Unknown'} · Submitted ${new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
              ${r.updated_at && r.updated_at !== r.created_at ? ` · Updated ${new Date(r.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
              ${isCompleted && r.completed_at ? ` · Completed ${new Date(r.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
            </div>
          </div>
          <div class="flex gap-1 shrink-0 flex-wrap justify-end">
            ${!isCompleted ? `
              <select class="inp text-xs py-1 w-28 status-change" data-id="${r.id}">
                ${STATUSES.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <button class="btn-ghost text-xs edit-feature" data-id="${r.id}">Edit</button>
            ` : ''}
            <button class="btn-red text-xs delete-feature" data-id="${r.id}">Del</button>
          </div>
        </div>
      </div>`
  }).join('')

  // Wire status changes
  el.querySelectorAll('.status-change').forEach(sel => {
    sel.addEventListener('change', async () => {
      const updates = { status: sel.value }
      if (sel.value === 'Completed') updates.completed_at = new Date().toISOString()
      try {
        await updateFeatureRequest(sel.dataset.id, updates)
        toast(`Status → ${sel.value}`, 'success')
        loadFeatures()
      } catch (err) { toast(err.message, 'error') }
    })
  })

  // Wire edit
  el.querySelectorAll('.edit-feature').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id))
  })

  // Wire delete
  el.querySelectorAll('.delete-feature').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this feature request?')) return
      try {
        await deleteFeatureRequest(btn.dataset.id)
        toast('Deleted', 'info')
        loadFeatures()
      } catch (err) { toast(err.message, 'error') }
    })
  })
}

function openEditModal(id) {
  const r = requests.find(req => req.id === id)
  if (!r) return

  const body = document.getElementById('editFeatureBody')
  body.innerHTML = `
    <div class="space-y-3">
      <div>
        <label class="lbl">Title</label>
        <input id="efTitle" type="text" class="inp" value="${r.title}" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="lbl">Category</label>
          <select id="efCategory" class="inp">
            ${CATEGORIES.map(c => `<option value="${c}" ${r.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="lbl">Priority</label>
          <select id="efPriority" class="inp">
            ${PRIORITIES.map(p => `<option value="${p}" ${r.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="lbl">Description</label>
        <textarea id="efDesc" rows="3" class="inp resize-y">${r.description || ''}</textarea>
      </div>
      <div>
        <label class="lbl">Admin Notes</label>
        <textarea id="efNotes" rows="2" class="inp resize-y" placeholder="Internal notes...">${r.admin_notes || ''}</textarea>
      </div>
      <div>
        <label class="lbl">Progress Log</label>
        <textarea id="efLog" rows="3" class="inp resize-y text-xs" placeholder="Add timestamped updates...">${r.progress_log || ''}</textarea>
        <button id="efAddLog" class="text-xs text-emerald-400 mt-1 cursor-pointer bg-transparent border-none hover:underline">+ Add timestamped entry</button>
      </div>
      <div class="flex gap-2 pt-2">
        <button id="efSave" class="btn-green">Save</button>
        <button id="efCancel" class="btn-ghost">Cancel</button>
      </div>
    </div>`

  // Add timestamped log entry
  body.querySelector('#efAddLog').addEventListener('click', () => {
    const log = body.querySelector('#efLog')
    const timestamp = new Date().toLocaleString()
    log.value = (log.value ? log.value + '\n' : '') + `[${timestamp}] `
    log.focus()
    log.setSelectionRange(log.value.length, log.value.length)
  })

  // Save
  body.querySelector('#efSave').addEventListener('click', async () => {
    const btn = body.querySelector('#efSave')
    btn.disabled = true; btn.textContent = 'Saving...'
    try {
      await updateFeatureRequest(id, {
        title: body.querySelector('#efTitle').value.trim(),
        category: body.querySelector('#efCategory').value,
        priority: body.querySelector('#efPriority').value,
        description: body.querySelector('#efDesc').value.trim() || null,
        admin_notes: body.querySelector('#efNotes').value.trim() || null,
        progress_log: body.querySelector('#efLog').value.trim() || null,
      })
      toast('Updated', 'success')
      closeEditModal()
      loadFeatures()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      btn.disabled = false; btn.textContent = 'Save'
    }
  })

  body.querySelector('#efCancel').addEventListener('click', closeEditModal)
  document.getElementById('editFeatureModal').classList.remove('hidden')
}
