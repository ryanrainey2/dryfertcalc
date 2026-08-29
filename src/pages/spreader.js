import { signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast, icon } from '../ui.js'

// Common spreader calibration formulas
// Rate (lbs/ac) = (lbs caught / swath width ft × distance ft) × 43560

export async function renderSpreader(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">${icon('settings','w-5 h-5 inline -mt-0.5')} Spreader Calibration</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Calculate applicator settings and verify rates</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-ghost">${icon('wheat','w-4 h-4 inline -mt-0.5')} Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Ground Speed Calculator -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-emerald-400">🚜 Ground Speed → Application Rate</h2>
          <p class="text-xs text-zinc-500 mb-4">Given a known gate output and ground speed, calculate the application rate.</p>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Swath Width (ft)</label><input id="gsSwath" type="number" step="1" value="60" class="inp" /></div>
              <div><label class="lbl">Ground Speed (mph)</label><input id="gsSpeed" type="number" step="0.1" value="8" class="inp" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Output Rate (lbs/min)</label><input id="gsOutput" type="number" step="1" value="500" class="inp" /></div>
              <div><label class="lbl">Product Density</label>
                <select id="gsDensity" class="inp">
                  <option value="standard">Standard (~60 lbs/ft³)</option>
                  <option value="light">Light (~45 lbs/ft³)</option>
                  <option value="heavy">Heavy (~75 lbs/ft³)</option>
                </select>
              </div>
            </div>
            <button id="btnCalcGS" class="btn-green w-full">Calculate</button>
            <div id="gsResult" class="bg-zinc-800/50 rounded-xl p-4 text-center">
              <div class="text-xs text-zinc-500 mb-1">Application Rate</div>
              <div id="gsRateLbs" class="text-3xl font-bold text-emerald-400">—</div>
              <div class="text-xs text-zinc-500 mt-1">lbs/acre</div>
              <div class="grid grid-cols-2 gap-3 mt-3 text-center">
                <div><div class="text-xs text-zinc-500">Acres/Hour</div><div id="gsAcHr" class="font-bold text-lg">—</div></div>
                <div><div class="text-xs text-zinc-500">Tons/Hour</div><div id="gsTonHr" class="font-bold text-lg">—</div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Catch Test Calculator -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-blue-400">🪣 Catch Test Verification</h2>
          <p class="text-xs text-zinc-500 mb-4">Verify actual application rate from a catch pan test in the field.</p>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Pan Width (inches)</label><input id="ctPanW" type="number" step="0.1" value="24" class="inp" /></div>
              <div><label class="lbl">Pan Length (inches)</label><input id="ctPanL" type="number" step="0.1" value="36" class="inp" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="lbl">Caught Weight (oz)</label><input id="ctWeight" type="number" step="0.1" value="0" class="inp" /></div>
              <div><label class="lbl">Swath Width (ft)</label><input id="ctSwath" type="number" step="1" value="60" class="inp" /></div>
            </div>
            <div><label class="lbl"># of Pans Averaged</label><input id="ctPans" type="number" step="1" value="3" class="inp" /></div>
            <button id="btnCalcCT" class="btn-blue w-full">Calculate</button>
            <div id="ctResult" class="bg-zinc-800/50 rounded-xl p-4 text-center">
              <div class="text-xs text-zinc-500 mb-1">Actual Rate</div>
              <div id="ctRate" class="text-3xl font-bold text-blue-400">—</div>
              <div class="text-xs text-zinc-500 mt-1">lbs/acre</div>
              <div id="ctCompare" class="mt-3 text-sm"></div>
            </div>
          </div>
        </div>

        <!-- Speed/Gate Chart -->
        <div class="card p-5 lg:col-span-2">
          <h2 class="text-sm font-semibold mb-4 text-amber-400">${icon('chart','w-4 h-4 inline -mt-0.5')} Speed vs. Rate Chart</h2>
          <p class="text-xs text-zinc-500 mb-4">See how ground speed affects your application rate for a given output.</p>
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div><label class="lbl">Swath Width (ft)</label><input id="chSwath" type="number" step="1" value="60" class="inp" /></div>
            <div><label class="lbl">Output Rate (lbs/min)</label><input id="chOutput" type="number" step="10" value="500" class="inp" /></div>
            <div><label class="lbl">Target Rate (lbs/ac)</label><input id="chTarget" type="number" step="10" value="300" class="inp" /></div>
          </div>
          <button id="btnGenChart" class="btn-amber mb-4">Generate Chart</button>
          <div id="chartTable" class="overflow-x-auto rounded-xl border border-zinc-800"></div>
        </div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  // Ground Speed Calculator
  document.getElementById('btnCalcGS').addEventListener('click', () => {
    const swath = parseFloat(document.getElementById('gsSwath').value) || 60
    const speed = parseFloat(document.getElementById('gsSpeed').value) || 8
    const output = parseFloat(document.getElementById('gsOutput').value) || 0
    // ft/min = mph × 88
    const ftPerMin = speed * 88
    // acres/min = (swath × ft/min) / 43560
    const acPerMin = (swath * ftPerMin) / 43560
    const lbsPerAcre = acPerMin > 0 ? output / acPerMin : 0
    const acPerHr = acPerMin * 60
    const tonsPerHr = (output * 60) / 2000

    document.getElementById('gsRateLbs').textContent = lbsPerAcre.toFixed(1)
    document.getElementById('gsAcHr').textContent = acPerHr.toFixed(1)
    document.getElementById('gsTonHr').textContent = tonsPerHr.toFixed(1)
  })

  // Catch Test Calculator
  document.getElementById('btnCalcCT').addEventListener('click', () => {
    const panW = parseFloat(document.getElementById('ctPanW').value) || 24
    const panL = parseFloat(document.getElementById('ctPanL').value) || 36
    const weight = parseFloat(document.getElementById('ctWeight').value) || 0
    const swath = parseFloat(document.getElementById('ctSwath').value) || 60
    const pans = parseInt(document.getElementById('ctPans').value) || 1

    // Pan area in sq ft
    const panSqFt = (panW * panL) / 144
    // lbs caught per pan
    const lbsPerPan = weight / 16 / pans
    // Rate = (lbs / panSqFt) * 43560 / (swath / panWidth_in_ft)
    // Simplified: rate = (lbs / sq ft) × 43560
    const lbsPerSqFt = lbsPerPan / panSqFt
    const rate = lbsPerSqFt * 43560

    document.getElementById('ctRate').textContent = rate.toFixed(1)
  })

  // Speed Chart
  document.getElementById('btnGenChart').addEventListener('click', () => {
    const swath = parseFloat(document.getElementById('chSwath').value) || 60
    const output = parseFloat(document.getElementById('chOutput').value) || 500
    const target = parseFloat(document.getElementById('chTarget').value) || 300

    const speeds = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16]
    const rows = speeds.map(s => {
      const ftPerMin = s * 88
      const acPerMin = (swath * ftPerMin) / 43560
      const rate = acPerMin > 0 ? output / acPerMin : 0
      const diff = rate - target
      const pct = target > 0 ? ((diff / target) * 100).toFixed(0) : 0
      const color = Math.abs(diff) < target * 0.05 ? 'text-emerald-400 font-bold' : Math.abs(diff) < target * 0.15 ? 'text-amber-400' : 'text-red-400'
      return `<tr class="hover:bg-zinc-800/30"><td class="px-4 py-2 text-center">${s}</td><td class="px-4 py-2 text-right font-medium ${color}">${rate.toFixed(1)}</td><td class="px-4 py-2 text-right ${color}">${diff > 0 ? '+' : ''}${diff.toFixed(0)} (${pct}%)</td><td class="px-4 py-2 text-right">${(acPerMin * 60).toFixed(1)}</td></tr>`
    })

    document.getElementById('chartTable').innerHTML = `
      <table class="w-full text-sm">
        <thead><tr class="bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
          <th class="px-4 py-2 font-medium">Speed (mph)</th>
          <th class="px-4 py-2 text-right font-medium">Rate (lbs/ac)</th>
          <th class="px-4 py-2 text-right font-medium">vs Target</th>
          <th class="px-4 py-2 text-right font-medium">Ac/Hr</th>
        </tr></thead>
        <tbody class="text-zinc-300 divide-y divide-zinc-800">${rows.join('')}</tbody>
      </table>
      <div class="p-3 text-xs text-zinc-500 text-center">Green = within 5% of target · Yellow = within 15% · Red = >15% off</div>`
  })
}
