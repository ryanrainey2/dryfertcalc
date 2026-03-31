import { listFields, listSoilTests, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

let fields = []
let companyId = null

export async function renderVRT(profile, company) {
  companyId = company?.id
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">🗺️ Variable Rate Prescriptions</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Create zone-based rate maps for precision application</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Zone Builder -->
      <div class="card p-5 mb-5">
        <h2 class="text-sm font-semibold mb-4 text-emerald-400">Zone-Based Prescription Builder</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div><label class="lbl">Field</label>
            <select id="vrtField" class="inp"><option value="">Select field...</option></select>
          </div>
          <div><label class="lbl">Prescription Type</label>
            <select id="vrtType" class="inp">
              <option value="blend">Dry Blend (lbs/ac)</option>
              <option value="n">Nitrogen Only (lbs N/ac)</option>
              <option value="p">Phosphate Only (lbs P₂O₅/ac)</option>
              <option value="k">Potash Only (lbs K₂O/ac)</option>
              <option value="lime">Lime (tons/ac)</option>
              <option value="seed">Seed (seeds/ac)</option>
            </select>
          </div>
          <div><label class="lbl">Export Format</label>
            <select id="vrtFormat" class="inp">
              <option value="csv">CSV (Universal)</option>
              <option value="shapefile">Shapefile (.shp) Info</option>
              <option value="agLeader">Ag Leader (.rx)</option>
              <option value="johnDeere">John Deere (.shp)</option>
              <option value="trimble">Trimble (.agsetup)</option>
            </select>
          </div>
        </div>

        <button id="btnAddZone" class="btn-ghost text-xs mb-3">+ Add Zone</button>

        <!-- Zone Table -->
        <div class="overflow-x-auto rounded-xl border border-zinc-800 mb-4">
          <table class="w-full text-sm">
            <thead><tr class="bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
              <th class="px-4 py-2 text-left font-medium">Zone</th>
              <th class="px-4 py-2 text-right font-medium">Acres</th>
              <th class="px-4 py-2 text-right font-medium">Soil Test P</th>
              <th class="px-4 py-2 text-right font-medium">Soil Test K</th>
              <th class="px-4 py-2 text-right font-medium">Rate</th>
              <th class="px-4 py-2 text-right font-medium">Total Product</th>
              <th class="px-4 py-2 text-right font-medium"></th>
            </tr></thead>
            <tbody id="zoneBody" class="text-zinc-300 divide-y divide-zinc-800"></tbody>
            <tfoot><tr class="bg-zinc-800/30 font-bold">
              <td class="px-4 py-2">Totals</td>
              <td id="totalAcres" class="px-4 py-2 text-right">0</td>
              <td class="px-4 py-2"></td>
              <td class="px-4 py-2"></td>
              <td id="avgRate" class="px-4 py-2 text-right text-emerald-400">0</td>
              <td id="totalProduct" class="px-4 py-2 text-right text-amber-400">0</td>
              <td class="px-4 py-2"></td>
            </tr></tfoot>
          </table>
        </div>

        <div class="flex gap-2">
          <button id="btnExportRx" class="btn-green">📤 Export Prescription</button>
          <button id="btnPrintRx" class="btn-blue">🖨️ Print Summary</button>
        </div>
      </div>

      <!-- Rate Recommendation Table -->
      <div class="card p-5">
        <h2 class="text-sm font-semibold mb-4 text-blue-400">📊 Soil Test-Based Rate Guide</h2>
        <p class="text-xs text-zinc-500 mb-3">Use this table to determine rates based on soil test levels (Mehlich-3, lbs/ac build + maintenance).</p>
        <div class="overflow-x-auto rounded-xl border border-zinc-800">
          <table class="w-full text-sm">
            <thead><tr class="bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
              <th class="px-4 py-2 text-left font-medium">Soil Test Level</th>
              <th class="px-4 py-2 text-right font-medium">P ppm</th>
              <th class="px-4 py-2 text-right font-medium">P₂O₅ Rec</th>
              <th class="px-4 py-2 text-right font-medium">K ppm</th>
              <th class="px-4 py-2 text-right font-medium">K₂O Rec</th>
            </tr></thead>
            <tbody class="text-zinc-300 divide-y divide-zinc-800">
              <tr class="text-red-400"><td class="px-4 py-2 font-medium">Very Low</td><td class="px-4 py-2 text-right">&lt;8</td><td class="px-4 py-2 text-right font-bold">80-100</td><td class="px-4 py-2 text-right">&lt;75</td><td class="px-4 py-2 text-right font-bold">120-150</td></tr>
              <tr class="text-amber-400"><td class="px-4 py-2 font-medium">Low</td><td class="px-4 py-2 text-right">8-15</td><td class="px-4 py-2 text-right font-bold">60-80</td><td class="px-4 py-2 text-right">75-125</td><td class="px-4 py-2 text-right font-bold">80-120</td></tr>
              <tr class="text-emerald-400"><td class="px-4 py-2 font-medium">Optimum</td><td class="px-4 py-2 text-right">15-30</td><td class="px-4 py-2 text-right font-bold">30-50</td><td class="px-4 py-2 text-right">125-200</td><td class="px-4 py-2 text-right font-bold">40-60</td></tr>
              <tr class="text-blue-400"><td class="px-4 py-2 font-medium">High</td><td class="px-4 py-2 text-right">30-60</td><td class="px-4 py-2 text-right font-bold">0-20</td><td class="px-4 py-2 text-right">200-300</td><td class="px-4 py-2 text-right font-bold">0-20</td></tr>
              <tr class="text-violet-400"><td class="px-4 py-2 font-medium">Very High</td><td class="px-4 py-2 text-right">&gt;60</td><td class="px-4 py-2 text-right font-bold">0</td><td class="px-4 py-2 text-right">&gt;300</td><td class="px-4 py-2 text-right font-bold">0</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  // Load fields
  if (companyId) {
    try {
      fields = await listFields(companyId)
      const sel = document.getElementById('vrtField')
      fields.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.name} (${f.acres} ac)`; sel.appendChild(o) })
    } catch {}
  }

  // Initialize with 3 sample zones
  const zones = [
    { name: 'Zone 1 - High', acres: 30, p: 35, k: 220, rate: 250 },
    { name: 'Zone 2 - Medium', acres: 40, p: 18, k: 150, rate: 350 },
    { name: 'Zone 3 - Low', acres: 30, p: 8, k: 90, rate: 500 },
  ]

  function renderZones() {
    const tbody = document.getElementById('zoneBody')
    tbody.innerHTML = zones.map((z, i) => `
      <tr>
        <td class="px-4 py-2"><input type="text" class="inp text-xs py-1 zone-name" data-idx="${i}" value="${z.name}" /></td>
        <td class="px-4 py-2"><input type="number" step="0.1" class="inp text-xs py-1 w-20 text-right zone-acres" data-idx="${i}" value="${z.acres}" /></td>
        <td class="px-4 py-2"><input type="number" step="1" class="inp text-xs py-1 w-16 text-right zone-p" data-idx="${i}" value="${z.p}" /></td>
        <td class="px-4 py-2"><input type="number" step="1" class="inp text-xs py-1 w-16 text-right zone-k" data-idx="${i}" value="${z.k}" /></td>
        <td class="px-4 py-2"><input type="number" step="1" class="inp text-xs py-1 w-20 text-right zone-rate" data-idx="${i}" value="${z.rate}" /></td>
        <td class="px-4 py-2 text-right font-medium">${((z.acres * z.rate) / 2000).toFixed(2)} tons</td>
        <td class="px-4 py-2"><button class="btn-red text-xs del-zone" data-idx="${i}">✕</button></td>
      </tr>`
    ).join('')

    // Update totals
    const totalAc = zones.reduce((s, z) => s + z.acres, 0)
    const totalProd = zones.reduce((s, z) => s + z.acres * z.rate, 0)
    document.getElementById('totalAcres').textContent = totalAc.toFixed(1)
    document.getElementById('avgRate').textContent = totalAc > 0 ? (totalProd / totalAc).toFixed(0) + ' avg' : '0'
    document.getElementById('totalProduct').textContent = (totalProd / 2000).toFixed(2) + ' tons'

    // Wire events
    tbody.querySelectorAll('.zone-name').forEach(el => el.addEventListener('input', () => { zones[el.dataset.idx].name = el.value }))
    tbody.querySelectorAll('.zone-acres').forEach(el => el.addEventListener('input', () => { zones[el.dataset.idx].acres = parseFloat(el.value) || 0; renderZones() }))
    tbody.querySelectorAll('.zone-p').forEach(el => el.addEventListener('input', () => { zones[el.dataset.idx].p = parseFloat(el.value) || 0 }))
    tbody.querySelectorAll('.zone-k').forEach(el => el.addEventListener('input', () => { zones[el.dataset.idx].k = parseFloat(el.value) || 0 }))
    tbody.querySelectorAll('.zone-rate').forEach(el => el.addEventListener('input', () => { zones[el.dataset.idx].rate = parseFloat(el.value) || 0; renderZones() }))
    tbody.querySelectorAll('.del-zone').forEach(btn => btn.addEventListener('click', () => { zones.splice(parseInt(btn.dataset.idx), 1); renderZones() }))
  }

  renderZones()

  document.getElementById('btnAddZone').addEventListener('click', () => {
    zones.push({ name: `Zone ${zones.length + 1}`, acres: 20, p: 20, k: 150, rate: 300 })
    renderZones()
  })

  // Export
  document.getElementById('btnExportRx').addEventListener('click', () => {
    const format = document.getElementById('vrtFormat').value
    const type = document.getElementById('vrtType').value

    if (format === 'csv') {
      const header = 'Zone,Acres,Soil_Test_P_ppm,Soil_Test_K_ppm,Rate_lbs_per_ac,Total_Product_tons\n'
      const rows = zones.map(z => `"${z.name}",${z.acres},${z.p},${z.k},${z.rate},${((z.acres * z.rate) / 2000).toFixed(2)}`).join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `prescription-${type}-${new Date().toISOString().split('T')[0]}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast('CSV exported', 'success')
    } else {
      toast(`${format} format: Export the CSV and convert using your monitor software (Ag Leader SMS, JD Operations Center, or Trimble Ag Software)`, 'info')
    }
  })

  // Print summary
  document.getElementById('btnPrintRx').addEventListener('click', () => {
    const field = fields.find(f => f.id === document.getElementById('vrtField').value)
    const fieldName = field?.name || 'All Fields'
    const type = document.getElementById('vrtType').selectedOptions[0]?.textContent || ''
    const totalAc = zones.reduce((s, z) => s + z.acres, 0)
    const totalProd = zones.reduce((s, z) => s + z.acres * z.rate, 0)

    const html = `<div style="padding:40px;font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111;">
      <h1 style="font-size:22px;color:#059669;margin:0;">Variable Rate Prescription Summary</h1>
      <p style="color:#666;margin:4px 0 16px;">${fieldName} · ${type} · ${new Date().toLocaleDateString()}</p>
      <hr style="border-color:#ddd;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="background:#f5f5f5;"><th style="padding:8px 12px;text-align:left;border:1px solid #ddd;">Zone</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Acres</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">P ppm</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">K ppm</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Rate (lbs/ac)</th><th style="padding:8px 12px;text-align:right;border:1px solid #ddd;">Total (tons)</th></tr>
        ${zones.map(z => `<tr><td style="padding:8px 12px;border:1px solid #ddd;">${z.name}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${z.acres}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${z.p}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${z.k}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;font-weight:bold;">${z.rate}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${((z.acres * z.rate) / 2000).toFixed(2)}</td></tr>`).join('')}
        <tr style="background:#f0fdf4;font-weight:bold;"><td style="padding:8px 12px;border:1px solid #ddd;">Total</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${totalAc}</td><td style="padding:8px 12px;border:1px solid #ddd;" colspan="2"></td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${totalAc > 0 ? (totalProd / totalAc).toFixed(0) + ' avg' : '0'}</td><td style="padding:8px 12px;text-align:right;border:1px solid #ddd;">${(totalProd / 2000).toFixed(2)}</td></tr>
      </table>
      <p style="text-align:center;font-size:10px;color:#999;margin-top:24px;">© ${new Date().getFullYear()} FertCalc Pro</p>
    </div>`

    html2pdf().set({ margin: 0, filename: `vrt-prescription-${fieldName.replace(/\s+/g, '-')}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, onclone: (doc) => { doc.querySelectorAll('link[rel="stylesheet"],style').forEach(s => s.remove()) } }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(html).save()
    toast('PDF generated', 'success')
  })
}
