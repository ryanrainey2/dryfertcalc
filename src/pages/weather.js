import { signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

// Application condition thresholds
const CONDITIONS = {
  wind: { ideal: [0, 10], caution: [10, 15], avoid: [15, 100], unit: 'mph' },
  temp: { ideal: [40, 85], caution: [32, 40], avoid: [-20, 32], unit: '°F' },
  precip: { ideal: [0, 0.1], caution: [0.1, 0.5], avoid: [0.5, 100], unit: 'in' },
}

export async function renderWeather(profile) {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-6">
      <header class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">🌤️ Weather & Application Timing</h1>
          <p class="text-xs text-zinc-500 mt-0.5">Check conditions before heading to the field</p>
        </div>
        <div class="flex gap-2">
          <button id="btnGoApp" class="btn-ghost">🌾 Calculator</button>
          <button id="btnLogout" class="btn-ghost">Sign Out</button>
        </div>
      </header>

      <!-- Location -->
      <div class="card p-4 mb-5">
        <div class="flex items-end gap-3 flex-wrap">
          <div class="flex-1 min-w-[200px]"><label class="lbl">Location (ZIP or City)</label><input id="wxLocation" type="text" class="inp" placeholder="e.g. 68508 or Lincoln, NE" /></div>
          <button id="btnGetWeather" class="btn-green">Get Forecast</button>
          <button id="btnUseGPS" class="btn-ghost">📍 Use My Location</button>
        </div>
      </div>

      <!-- Loading -->
      <div id="wxLoading" class="hidden text-center py-8 text-zinc-500">Loading forecast...</div>

      <!-- Forecast -->
      <div id="wxContent" class="hidden space-y-5">
        <!-- Current Conditions -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-emerald-400">Current Conditions</h2>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div class="bg-zinc-800/50 rounded-xl p-3">
              <div class="text-3xl mb-1" id="wxIcon">🌤️</div>
              <div id="wxDesc" class="text-sm font-medium">Clear</div>
            </div>
            <div class="bg-zinc-800/50 rounded-xl p-3">
              <div class="text-xs text-zinc-500">Temp</div>
              <div id="wxTemp" class="text-2xl font-bold">—</div>
            </div>
            <div class="bg-zinc-800/50 rounded-xl p-3">
              <div class="text-xs text-zinc-500">Wind</div>
              <div id="wxWind" class="text-2xl font-bold">—</div>
            </div>
            <div class="bg-zinc-800/50 rounded-xl p-3">
              <div class="text-xs text-zinc-500">Humidity</div>
              <div id="wxHumidity" class="text-2xl font-bold">—</div>
            </div>
            <div class="bg-zinc-800/50 rounded-xl p-3">
              <div class="text-xs text-zinc-500">Soil Temp (est)</div>
              <div id="wxSoilTemp" class="text-2xl font-bold">—</div>
            </div>
          </div>
        </div>

        <!-- Application Window -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-amber-400">Application Window Assessment</h2>
          <div id="wxAssessment" class="space-y-3"></div>
        </div>

        <!-- 7-Day Forecast -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-blue-400">7-Day Forecast</h2>
          <div id="wxForecast" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"></div>
        </div>

        <!-- Soil Temp Guide -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold mb-4 text-violet-400">🌡️ Soil Temperature Guide</h2>
          <div class="overflow-x-auto rounded-xl border border-zinc-800">
            <table class="w-full text-sm">
              <thead><tr class="bg-zinc-800/50 text-zinc-400 border-b border-zinc-700">
                <th class="text-left px-4 py-2 font-medium">Soil Temp</th>
                <th class="text-left px-4 py-2 font-medium">N Management</th>
                <th class="text-left px-4 py-2 font-medium">Action</th>
              </tr></thead>
              <tbody class="text-zinc-300 divide-y divide-zinc-800">
                <tr><td class="px-4 py-2 font-bold text-blue-400">&lt; 50°F</td><td class="px-4 py-2">Nitrification slows significantly</td><td class="px-4 py-2 text-emerald-400">Safe for fall anhydrous/urea</td></tr>
                <tr><td class="px-4 py-2 font-bold text-emerald-400">50-60°F</td><td class="px-4 py-2">N stabilizer recommended</td><td class="px-4 py-2 text-amber-400">Use nitrification inhibitor</td></tr>
                <tr><td class="px-4 py-2 font-bold text-amber-400">60-70°F</td><td class="px-4 py-2">Active nitrification</td><td class="px-4 py-2 text-amber-400">Spring application preferred</td></tr>
                <tr><td class="px-4 py-2 font-bold text-red-400">&gt; 70°F</td><td class="px-4 py-2">Rapid nitrification & potential loss</td><td class="px-4 py-2 text-red-400">Side-dress timing critical</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`

  document.getElementById('btnGoApp').addEventListener('click', () => navigate('/app'))
  document.getElementById('btnLogout').addEventListener('click', async () => { await signOut(); navigate('/login') })

  document.getElementById('btnGetWeather').addEventListener('click', fetchWeather)
  document.getElementById('btnUseGPS').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('wxLocation').value = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
          fetchWeather()
        },
        () => toast('Location access denied', 'error')
      )
    } else {
      toast('Geolocation not supported', 'error')
    }
  })
}

async function fetchWeather() {
  const location = document.getElementById('wxLocation').value.trim()
  if (!location) { toast('Enter a location', 'error'); return }

  document.getElementById('wxLoading').classList.remove('hidden')
  document.getElementById('wxContent').classList.add('hidden')

  try {
    // Geocode the location
    let lat, lon, locationName = ''
    if (location.includes(',') && !isNaN(location.split(',')[0])) {
      // Lat,lon pair
      [lat, lon] = location.split(',').map(s => parseFloat(s.trim()))
    } else if (/^\d{5}$/.test(location)) {
      // US ZIP code — use Nominatim (free, no key)
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${location}&country=US&format=json&limit=1`, { headers: { 'User-Agent': 'FertCalcPro/1.0' } })
      const geoData = await geoRes.json()
      if (!geoData.length) { toast('ZIP code not found', 'error'); return }
      lat = parseFloat(geoData[0].lat)
      lon = parseFloat(geoData[0].lon)
      locationName = geoData[0].display_name?.split(',').slice(0, 2).join(',') || ''
    } else {
      // City name — use Open-Meteo geocoding
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`)
      const geoData = await geoRes.json()
      if (!geoData.results?.length) { toast('Location not found', 'error'); return }
      lat = geoData.results[0].latitude
      lon = geoData.results[0].longitude
      locationName = geoData.results[0].name + (geoData.results[0].admin1 ? ', ' + geoData.results[0].admin1 : '')
    }

    // Fetch weather — soil_temperature_0cm returns in Celsius regardless of temperature_unit, so fetch it separately
    const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&hourly=temperature_2m,wind_speed_10m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/Chicago&forecast_days=7`)
    const wx = await wxRes.json()

    // Fetch soil temp separately in Celsius, then convert manually
    const soilRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=soil_temperature_0cm&timezone=America/Chicago`)
    const soilData = await soilRes.json()
    wx._soilTempF = soilData.current?.soil_temperature_0cm != null ? Math.round(soilData.current.soil_temperature_0cm * 9/5 + 32) : null
    wx._locationName = locationName

    displayWeather(wx)
  } catch (err) {
    toast('Failed to fetch weather: ' + err.message, 'error')
  } finally {
    document.getElementById('wxLoading').classList.add('hidden')
  }
}

const WMO_ICONS = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌧️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌦️', 81: '🌧️', 82: '🌧️', 95: '⛈️', 96: '⛈️', 99: '⛈️' }
const WMO_DESC = { 0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle', 61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 80: 'Showers', 81: 'Mod Showers', 82: 'Heavy Showers', 95: 'Thunderstorm', 96: 'T-Storm + Hail', 99: 'Severe T-Storm' }

function checkInversion(wx) {
  // Detect temperature inversion conditions:
  // - Low wind speed (< 5 mph)
  // - Clear or mostly clear skies (WMO code 0-1)
  // - Early morning or evening hours (before 9am or after 5pm)
  // - Surface temp dropping (hourly data shows temp decreasing)
  const c = wx.current
  const wind = c.wind_speed_10m || 0
  const code = c.weather_code || 0
  const hour = new Date().getHours()
  const isLowWind = wind < 5
  const isClearSky = code <= 2
  const isInversionTime = hour < 9 || hour >= 17

  // Check hourly data for temp gradient if available
  let tempDropping = false
  if (wx.hourly?.temperature_2m) {
    const currentIdx = wx.hourly.time.findIndex(t => new Date(t) >= new Date()) - 1
    if (currentIdx > 0) {
      const prev = wx.hourly.temperature_2m[currentIdx - 1]
      const curr = wx.hourly.temperature_2m[currentIdx]
      tempDropping = curr < prev
    }
  }

  const riskFactors = [isLowWind, isClearSky, isInversionTime, tempDropping].filter(Boolean).length

  if (riskFactors >= 3) return { risk: 'high', label: 'High Risk' }
  if (riskFactors >= 2) return { risk: 'moderate', label: 'Moderate Risk' }
  return { risk: 'low', label: 'Low Risk' }
}

function displayWeather(wx) {
  const c = wx.current
  const code = c.weather_code || 0
  document.getElementById('wxIcon').textContent = WMO_ICONS[code] || '🌤️'
  document.getElementById('wxDesc').textContent = WMO_DESC[code] || 'Unknown'
  document.getElementById('wxTemp').textContent = Math.round(c.temperature_2m) + '°F'
  document.getElementById('wxWind').textContent = Math.round(c.wind_speed_10m) + ' mph'
  document.getElementById('wxHumidity').textContent = c.relative_humidity_2m + '%'

  // Soil temp — fetched separately in Celsius and converted
  const soilTemp = wx._soilTempF
  document.getElementById('wxSoilTemp').textContent = soilTemp != null ? soilTemp + '°F' : '—'

  // Assessment
  const assessments = []
  const wind = c.wind_speed_10m
  const temp = c.temperature_2m
  const gusts = c.wind_gusts_10m || wind

  if (wind < 10) assessments.push({ label: 'Wind', value: `${Math.round(wind)} mph`, status: 'good', note: 'Ideal for application' })
  else if (wind < 15) assessments.push({ label: 'Wind', value: `${Math.round(wind)} mph`, status: 'caution', note: 'Monitor for drift, reduce boom height' })
  else assessments.push({ label: 'Wind', value: `${Math.round(wind)} mph (gusts ${Math.round(gusts)})`, status: 'bad', note: 'Too windy — drift risk high' })

  if (temp >= 40 && temp <= 85) assessments.push({ label: 'Temperature', value: `${Math.round(temp)}°F`, status: 'good', note: 'Good application temp' })
  else if (temp >= 32) assessments.push({ label: 'Temperature', value: `${Math.round(temp)}°F`, status: 'caution', note: 'Cool — watch for frost' })
  else assessments.push({ label: 'Temperature', value: `${Math.round(temp)}°F`, status: 'bad', note: 'Below freezing — ground may be frozen' })

  if (soilTemp != null && soilTemp < 50) assessments.push({ label: 'Soil Temp', value: `${soilTemp}°F`, status: 'good', note: 'Safe for fall N application' })
  else if (soilTemp != null && soilTemp < 60) assessments.push({ label: 'Soil Temp', value: `${soilTemp}°F`, status: 'caution', note: 'Use N stabilizer' })
  else if (soilTemp != null) assessments.push({ label: 'Soil Temp', value: `${soilTemp}°F`, status: 'bad', note: 'Active nitrification — time sensitive' })

  // Inversion warning
  const inversion = checkInversion(wx)
  if (inversion.risk === 'high') assessments.push({ label: '⚠️ Inversion', value: inversion.label, status: 'bad', note: 'Calm winds + clear sky + evening/morning — spray drift will not disperse. Do NOT spray.' })
  else if (inversion.risk === 'moderate') assessments.push({ label: '⚠️ Inversion', value: inversion.label, status: 'caution', note: 'Conditions may favor inversion — watch for fog, calm air, and temperature drop' })
  else assessments.push({ label: 'Inversion', value: inversion.label, status: 'good', note: 'Low inversion risk — good mixing conditions' })

  // Check next 48h precip
  const todayPrecip = wx.daily?.precipitation_sum?.[0] || 0
  const tmrwPrecip = wx.daily?.precipitation_sum?.[1] || 0
  if (todayPrecip + tmrwPrecip < 0.1) assessments.push({ label: 'Precip (48hr)', value: `${(todayPrecip + tmrwPrecip).toFixed(1)}"`, status: 'good', note: 'Dry window — good to go' })
  else if (todayPrecip + tmrwPrecip < 0.5) assessments.push({ label: 'Precip (48hr)', value: `${(todayPrecip + tmrwPrecip).toFixed(1)}"`, status: 'caution', note: 'Light moisture expected' })
  else assessments.push({ label: 'Precip (48hr)', value: `${(todayPrecip + tmrwPrecip).toFixed(1)}"`, status: 'bad', note: 'Rain expected — delay application' })

  const statusColors = { good: 'bg-emerald-900/60 text-emerald-400', caution: 'bg-amber-900/60 text-amber-400', bad: 'bg-red-900/60 text-red-400' }
  const statusLabels = { good: 'Good', caution: 'Caution', bad: 'Avoid' }

  document.getElementById('wxAssessment').innerHTML = assessments.map(a => `
    <div class="flex items-center justify-between gap-3 p-3 bg-zinc-800/30 rounded-xl">
      <div class="min-w-0">
        <div class="font-medium text-sm">${a.label}: <span class="text-zinc-300">${a.value}</span></div>
        <div class="text-xs text-zinc-500">${a.note}</div>
      </div>
      <span class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[a.status]}">${statusLabels[a.status]}</span>
    </div>
  `).join('')

  // 7-day forecast
  const days = wx.daily
  document.getElementById('wxForecast').innerHTML = days.time.map((date, i) => {
    const dayCode = days.weather_code[i] || 0
    const dayName = i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })
    return `
      <div class="bg-zinc-800/50 rounded-xl p-3 text-center">
        <div class="text-xs text-zinc-500 mb-1">${dayName}</div>
        <div class="text-2xl mb-1">${WMO_ICONS[dayCode] || '🌤️'}</div>
        <div class="text-sm font-bold">${Math.round(days.temperature_2m_max[i])}°</div>
        <div class="text-xs text-zinc-500">${Math.round(days.temperature_2m_min[i])}°</div>
        ${days.precipitation_sum[i] > 0 ? `<div class="text-xs text-blue-400 mt-1">${days.precipitation_sum[i].toFixed(1)}"</div>` : ''}
        <div class="text-xs text-zinc-500 mt-1">💨 ${Math.round(days.wind_speed_10m_max[i])}</div>
      </div>`
  }).join('')

  document.getElementById('wxContent').classList.remove('hidden')
}
