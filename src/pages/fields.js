import { listFields, createField, updateField, deleteField, listSoilTests, listFieldApplications, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let fields = []
let companyId = null

export async function renderFields(profile, company) {
  companyId = company?.id
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">🗺️ Field Management</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Manage fields, acreage, and soil data</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btnNewField" class="btn-green">+ New Field</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnGoSoil" class="btn-ghost">🧪 Soil Tests</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="card p-3 text-center">
          <div id="statFields" class="text-2xl font-bold">0</div>
          <div class="text-xs text-zinc-500">Fields</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statAcres" class="text-2xl font-bold text-emerald-400">0</div>
          <div class="text-xs text-zinc-500">Total Acres</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statIrrigated" class="text-2xl font-bold text-blue-400">0</div>
          <div class="text-xs text-zinc-500">Irrigated</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statDryland" class="text-2xl font-bold text-amber-400">0</div>
          <div class="text-xs text-zinc-500">Dryland</div>
        </div>
      </div>

      <!-- New Field Form -->
      <div id="newFieldForm" class="hidden card p-5 mb-5">
        <h3 class="text-sm font-semibold mb-3">New Field</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div><label class="lbl">Field Name</label><input id="nfName" type="text" class="inp" placeholder="e.g. Smith North 80" /></div>
          <div><label class="lbl">Acres</label><input id="nfAcres" type="number" step="0.1" class="inp" placeholder="80" /></div>
          <div><label class="lbl">County</label><input id="nfCounty" type="text" class="inp" placeholder="County" /></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div><label class="lbl">State</label><input id="nfState" type="text" class="inp" placeholder="State" /></div>
          <div><label class="lbl">Soil Type</label><input id="nfSoilType" type="text" class="inp" placeholder="e.g. Silt Loam" /></div>
          <div><label class="lbl">Drainage</label>
            <select id="nfDrainage" class="inp">
              <option value="">Select...</option>
              <option>Well Drained</option>
              <option>Moderately Drained</option>
              <option>Poorly Drained</option>
              <option>Tile Drained</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><label class="lbl">Legal Description</label><input id="nfLegal" type="text" class="inp" placeholder="Section-Township-Range" /></div>
          <div class="flex items-center gap-3 pt-5">
            <input type="checkbox" id="nfIrrigation" class="w-5 h-5 accent-blue-500" />
            <label for="nfIrrigation" class="text-sm font-medium cursor-pointer">Irrigated</label>
          </div>
        </div>
        <div class="mb-3"><label class="lbl">Notes</label><textarea id="nfNotes" rows="2" class="inp resize-y" placeholder="Field notes..."></textarea></div>
        <div class="flex gap-2">
          <button id="btnSubmitField" class="btn-green">Create Field</button>
          <button id="btnCancelField" class="btn-ghost">Cancel</button>
        </div>
      </div>

      <!-- Fields List -->
      <div id="fieldsList" class="space-y-3"></div>
    </div>

    <!-- Edit Modal -->
    <div id="editFieldModal" class="hidden fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div class="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">Edit Field</h2>
          <button id="efClose" class="btn-ghost text-xs">✕</button>
        </div>
        <div id="editFieldBody"></div>
      </div>
    </div>`

  // Nav
  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnGoSoil').addEventListener('click', () => navigate('/soil-tests'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  // New field form
  document.getElementById('btnNewField').addEventListener('click', () => document.getElementById('newFieldForm').classList.remove('hidden'))
  document.getElementById('btnCancelField').addEventListener('click', () => document.getElementById('newFieldForm').classList.add('hidden'))

  // Submit field
  document.getElementById('btnSubmitField').addEventListener('click', async () => {
    const name = document.getElementById('nfName').value.trim()
    if (!name) { toast('Field name is required', 'error'); return }
    const btn = document.getElementById('btnSubmitField')
    btn.disabled = true; btn.textContent = 'Creating...'
    try {
      await createField({
        company_id: companyId,
        name,
        acres: parseFloat(document.getElementById('nfAcres').value) || 0,
        county: document.getElementById('nfCounty').value.trim() || null,
        state: document.getElementById('nfState').value.trim() || null,
        soil_type: document.getElementById('nfSoilType').value.trim() || null,
        drainage: document.getElementById('nfDrainage').value || null,
        legal_description: document.getElementById('nfLegal').value.trim() || null,
        irrigation: document.getElementById('nfIrrigation').checked,
        notes: document.getElementById('nfNotes').value.trim() || null,
      })
      toast('Field created', 'success')
      document.getElementById('newFieldForm').classList.add('hidden')
      document.getElementById('nfName').value = ''
      document.getElementById('nfAcres').value = ''
      loadFields()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = 'Create Field' }
  })

  // Modal
  document.getElementById('efClose').addEventListener('click', () => document.getElementById('editFieldModal').classList.add('hidden'))
  document.getElementById('editFieldModal').addEventListener('click', (e) => { if (e.target.id === 'editFieldModal') document.getElementById('editFieldModal').classList.add('hidden') })

  loadFields()
}

async function loadFields() {
  if (!companyId) { document.getElementById('fieldsList').innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No company assigned.</div>'; return }
  try {
    fields = await listFields(companyId)
    updateStats()
    renderFieldsList()
  } catch (err) { toast('Failed to load fields: ' + err.message, 'error') }
}

function updateStats() {
  document.getElementById('statFields').textContent = fields.length
  document.getElementById('statAcres').textContent = fields.reduce((s, f) => s + (f.acres || 0), 0).toLocaleString()
  document.getElementById('statIrrigated').textContent = fields.filter(f => f.irrigation).length
  document.getElementById('statDryland').textContent = fields.filter(f => !f.irrigation).length
}

function renderFieldsList() {
  const el = document.getElementById('fieldsList')
  if (!el) return
  if (fields.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No fields yet. Click "+ New Field" to add one.</div>'; return }

  el.innerHTML = fields.map(f => `
    <div class="card p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="font-semibold text-sm">${f.name}</h3>
            <span class="text-emerald-400 font-bold text-sm">${f.acres || 0} ac</span>
            ${f.irrigation ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/60 text-blue-400">Irrigated</span>' : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-900/60 text-amber-400">Dryland</span>'}
          </div>
          <div class="text-xs text-zinc-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
            ${f.county ? `<span>📍 ${f.county}${f.state ? ', ' + f.state : ''}</span>` : ''}
            ${f.soil_type ? `<span>🪨 ${f.soil_type}</span>` : ''}
            ${f.drainage ? `<span>💧 ${f.drainage}</span>` : ''}
            ${f.legal_description ? `<span>📋 ${f.legal_description}</span>` : ''}
          </div>
          ${f.notes ? `<p class="text-xs text-zinc-400 mt-1.5">${f.notes}</p>` : ''}
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="btn-ghost text-xs edit-field" data-id="${f.id}">Edit</button>
          <button class="btn-red text-xs del-field" data-id="${f.id}">Del</button>
        </div>
      </div>
    </div>
  `).join('')

  el.querySelectorAll('.edit-field').forEach(btn => btn.addEventListener('click', () => openEditField(btn.dataset.id)))
  el.querySelectorAll('.del-field').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this field and all its soil tests?')) return
    try { await deleteField(btn.dataset.id); toast('Deleted', 'info'); loadFields() }
    catch (err) { toast(err.message, 'error') }
  }))
}

function openEditField(id) {
  const f = fields.find(x => x.id === id)
  if (!f) return
  const body = document.getElementById('editFieldBody')
  body.innerHTML = `
    <div class="space-y-3">
      <div><label class="lbl">Field Name</label><input id="efName" type="text" class="inp" value="${f.name}" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">Acres</label><input id="efAcres" type="number" step="0.1" class="inp" value="${f.acres || ''}" /></div>
        <div><label class="lbl">County</label><input id="efCounty" type="text" class="inp" value="${f.county || ''}" /></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">State</label><input id="efState" type="text" class="inp" value="${f.state || ''}" /></div>
        <div><label class="lbl">Soil Type</label><input id="efSoilType" type="text" class="inp" value="${f.soil_type || ''}" /></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="lbl">Drainage</label>
          <select id="efDrainage" class="inp">
            <option value="">Select...</option>
            ${['Well Drained','Moderately Drained','Poorly Drained','Tile Drained'].map(d => `<option ${f.drainage === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-center gap-3 pt-5">
          <input type="checkbox" id="efIrrigation" class="w-5 h-5 accent-blue-500" ${f.irrigation ? 'checked' : ''} />
          <label for="efIrrigation" class="text-sm font-medium cursor-pointer">Irrigated</label>
        </div>
      </div>
      <div><label class="lbl">Legal Description</label><input id="efLegal" type="text" class="inp" value="${f.legal_description || ''}" /></div>
      <div><label class="lbl">Notes</label><textarea id="efNotes" rows="2" class="inp resize-y">${f.notes || ''}</textarea></div>
      <div class="flex gap-2 pt-2">
        <button id="efSave" class="btn-green">Save</button>
        <button id="efCancel" class="btn-ghost">Cancel</button>
      </div>
    </div>`

  body.querySelector('#efSave').addEventListener('click', async () => {
    const btn = body.querySelector('#efSave')
    btn.disabled = true; btn.textContent = 'Saving...'
    try {
      await updateField(id, {
        name: body.querySelector('#efName').value.trim(),
        acres: parseFloat(body.querySelector('#efAcres').value) || 0,
        county: body.querySelector('#efCounty').value.trim() || null,
        state: body.querySelector('#efState').value.trim() || null,
        soil_type: body.querySelector('#efSoilType').value.trim() || null,
        drainage: body.querySelector('#efDrainage').value || null,
        legal_description: body.querySelector('#efLegal').value.trim() || null,
        irrigation: body.querySelector('#efIrrigation').checked,
        notes: body.querySelector('#efNotes').value.trim() || null,
      })
      toast('Updated', 'success')
      document.getElementById('editFieldModal').classList.add('hidden')
      loadFields()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = 'Save' }
  })
  body.querySelector('#efCancel').addEventListener('click', () => document.getElementById('editFieldModal').classList.add('hidden'))
  document.getElementById('editFieldModal').classList.remove('hidden')
}
