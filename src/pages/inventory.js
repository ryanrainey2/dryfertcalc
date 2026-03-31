import { listInventory, upsertInventory, deleteInventoryItem, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

const ALL_PRODUCTS = [
  { key: 'an', name: 'Ammonium Nitrate', analysis: '34-0-0' },
  { key: 'map', name: 'MAP', analysis: '11-52-0' },
  { key: 'dap', name: 'DAP', analysis: '18-46-0' },
  { key: 'potash', name: 'Potash (KCl)', analysis: '0-0-60' },
  { key: 'sop', name: 'SOP (K₂SO₄)', analysis: '0-0-50-18S' },
  { key: 'ams', name: 'AMS', analysis: '21-0-0-24S' },
  { key: 'gypsum', name: 'Gypsum', analysis: '0-0-0-18S' },
  { key: 'urea', name: 'Urea', analysis: '46-0-0' },
  { key: 'uan32', name: 'UAN 32', analysis: '32-0-0' },
  { key: 'uan28', name: 'UAN 28', analysis: '28-0-0' },
  { key: 'app', name: '10-34-0 (APP)', analysis: '10-34-0' },
  { key: 'ats', name: 'ATS', analysis: '12-0-0-26S' },
  { key: 'kts', name: 'KTS', analysis: '0-0-25-17S' },
  { key: 'lime', name: 'Ag Lime', analysis: 'CaCO₃' },
  { key: 'zinc_sulfate', name: 'Zinc Sulfate', analysis: '36% Zn' },
  { key: 'boron', name: 'Granubor', analysis: '15% B' },
  { key: 'manganese', name: 'MnSO₄', analysis: '32% Mn' },
]

let items = []
let companyId = null

export async function renderInventory(profile, company) {
  companyId = company?.id
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">📦 Inventory</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Track product on hand and costs</p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btnAddProduct" class="btn-green">+ Add Product</button>
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="card p-3 text-center">
          <div id="statProducts" class="text-2xl font-bold">0</div>
          <div class="text-xs text-zinc-500">Products</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statTotalTons" class="text-2xl font-bold text-emerald-400">0</div>
          <div class="text-xs text-zinc-500">Total Tons</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statTotalValue" class="text-2xl font-bold text-blue-400">$0</div>
          <div class="text-xs text-zinc-500">Total Value</div>
        </div>
        <div class="card p-3 text-center">
          <div id="statLowStock" class="text-2xl font-bold text-red-400">0</div>
          <div class="text-xs text-zinc-500">Low Stock</div>
        </div>
      </div>

      <!-- Add Product Form -->
      <div id="addProductForm" class="hidden card p-5 mb-5">
        <h3 class="text-sm font-semibold mb-3">Add Inventory Item</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div><label class="lbl">Product</label>
            <select id="apProduct" class="inp">
              <option value="">Select product...</option>
              ${ALL_PRODUCTS.map(p => `<option value="${p.key}" data-name="${p.name}" data-analysis="${p.analysis}">${p.name} (${p.analysis})</option>`).join('')}
              <option value="custom">Custom Product...</option>
            </select>
          </div>
          <div id="customNameDiv" class="hidden"><label class="lbl">Custom Name</label><input id="apCustomName" type="text" class="inp" placeholder="Product name" /></div>
          <div id="customAnalysisDiv" class="hidden"><label class="lbl">Analysis</label><input id="apCustomAnalysis" type="text" class="inp" placeholder="e.g. 21-0-0-24S" /></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div><label class="lbl">Quantity (tons)</label><input id="apQty" type="number" step="0.1" class="inp" placeholder="50" /></div>
          <div><label class="lbl">Unit Cost ($/ton)</label><input id="apCost" type="number" step="1" class="inp" placeholder="650" /></div>
          <div><label class="lbl">Reorder Point (tons)</label><input id="apReorder" type="number" step="0.1" class="inp" placeholder="10" /></div>
          <div><label class="lbl">Location</label><input id="apLocation" type="text" class="inp" placeholder="Bin 3" /></div>
        </div>
        <div class="flex gap-2">
          <button id="btnSubmitProduct" class="btn-green">Add to Inventory</button>
          <button id="btnCancelProduct" class="btn-ghost">Cancel</button>
        </div>
      </div>

      <!-- Inventory Table -->
      <div id="inventoryTable" class="card overflow-hidden"></div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })
  document.getElementById('btnAddProduct').addEventListener('click', () => document.getElementById('addProductForm').classList.remove('hidden'))
  document.getElementById('btnCancelProduct').addEventListener('click', () => document.getElementById('addProductForm').classList.add('hidden'))

  // Show/hide custom fields
  document.getElementById('apProduct').addEventListener('change', (e) => {
    const isCustom = e.target.value === 'custom'
    document.getElementById('customNameDiv').classList.toggle('hidden', !isCustom)
    document.getElementById('customAnalysisDiv').classList.toggle('hidden', !isCustom)
  })

  // Submit
  document.getElementById('btnSubmitProduct').addEventListener('click', async () => {
    const sel = document.getElementById('apProduct')
    const isCustom = sel.value === 'custom'
    let productKey, productName, productAnalysis

    if (isCustom) {
      productName = document.getElementById('apCustomName').value.trim()
      productAnalysis = document.getElementById('apCustomAnalysis').value.trim()
      productKey = productName.toLowerCase().replace(/\s+/g, '_')
      if (!productName) { toast('Enter product name', 'error'); return }
    } else if (sel.value) {
      const opt = sel.selectedOptions[0]
      productKey = sel.value
      productName = opt.dataset.name
      productAnalysis = opt.dataset.analysis
    } else {
      toast('Select a product', 'error'); return
    }

    const btn = document.getElementById('btnSubmitProduct')
    btn.disabled = true; btn.textContent = 'Adding...'
    try {
      await upsertInventory({
        company_id: companyId,
        product_key: productKey,
        product_name: productName,
        product_analysis: productAnalysis || null,
        quantity_tons: parseFloat(document.getElementById('apQty').value) || 0,
        unit_cost: parseFloat(document.getElementById('apCost').value) || 0,
        reorder_point_tons: parseFloat(document.getElementById('apReorder').value) || 0,
        location: document.getElementById('apLocation').value.trim() || null,
        last_received: new Date().toISOString().split('T')[0],
      })
      toast('Added to inventory', 'success')
      document.getElementById('addProductForm').classList.add('hidden')
      loadInventory()
    } catch (err) { toast(err.message, 'error') }
    finally { btn.disabled = false; btn.textContent = 'Add to Inventory' }
  })

  loadInventory()
}

async function loadInventory() {
  if (!companyId) return
  try {
    items = await listInventory(companyId)
    updateStats()
    renderTable()
  } catch (err) { toast('Failed to load: ' + err.message, 'error') }
}

function updateStats() {
  const totalTons = items.reduce((s, i) => s + (i.quantity_tons || 0), 0)
  const totalValue = items.reduce((s, i) => s + (i.quantity_tons || 0) * (i.unit_cost || 0), 0)
  const lowStock = items.filter(i => i.reorder_point_tons > 0 && i.quantity_tons <= i.reorder_point_tons).length

  document.getElementById('statProducts').textContent = items.length
  document.getElementById('statTotalTons').textContent = totalTons.toFixed(1)
  document.getElementById('statTotalValue').textContent = '$' + totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
  document.getElementById('statLowStock').textContent = lowStock
}

function renderTable() {
  const el = document.getElementById('inventoryTable')
  if (items.length === 0) { el.innerHTML = '<div class="text-zinc-500 text-sm text-center py-8">No inventory items.</div>'; return }

  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[700px]">
        <thead><tr class="border-b border-zinc-700 bg-zinc-800/50 text-zinc-400">
          <th class="text-left px-4 py-3 font-medium">Product</th>
          <th class="text-right px-4 py-3 font-medium">On Hand (tons)</th>
          <th class="text-right px-4 py-3 font-medium">$/Ton</th>
          <th class="text-right px-4 py-3 font-medium">Value</th>
          <th class="text-left px-4 py-3 font-medium">Location</th>
          <th class="text-center px-4 py-3 font-medium">Status</th>
          <th class="text-right px-4 py-3 font-medium"></th>
        </tr></thead>
        <tbody class="text-zinc-300 divide-y divide-zinc-800">
          ${items.map(i => {
            const isLow = i.reorder_point_tons > 0 && i.quantity_tons <= i.reorder_point_tons
            const value = (i.quantity_tons || 0) * (i.unit_cost || 0)
            return `<tr class="hover:bg-zinc-800/30 transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium">${i.product_name}</div>
                <div class="text-xs text-zinc-500">${i.product_analysis || ''}</div>
              </td>
              <td class="px-4 py-3 text-right font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}">${(i.quantity_tons || 0).toFixed(1)}</td>
              <td class="px-4 py-3 text-right">$${(i.unit_cost || 0).toLocaleString()}</td>
              <td class="px-4 py-3 text-right">$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td class="px-4 py-3 text-zinc-400">${i.location || '—'}</td>
              <td class="px-4 py-3 text-center">${isLow ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/60 text-red-400">Low Stock</span>' : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/60 text-emerald-400">OK</span>'}</td>
              <td class="px-4 py-3 text-right">
                <button class="btn-ghost text-xs adj-qty" data-id="${i.id}" data-qty="${i.quantity_tons}">Adjust</button>
                <button class="btn-red text-xs del-inv" data-id="${i.id}">Del</button>
              </td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`

  el.querySelectorAll('.adj-qty').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newQty = prompt('Enter new quantity (tons):', btn.dataset.qty)
      if (newQty === null) return
      try {
        await upsertInventory({ id: btn.dataset.id, quantity_tons: parseFloat(newQty) || 0 })
        toast('Updated', 'success')
        loadInventory()
      } catch (err) { toast(err.message, 'error') }
    })
  })

  el.querySelectorAll('.del-inv').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove from inventory?')) return
      try { await deleteInventoryItem(btn.dataset.id); toast('Removed', 'info'); loadInventory() }
      catch (err) { toast(err.message, 'error') }
    })
  })
}
