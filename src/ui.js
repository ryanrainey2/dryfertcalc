// ── Toast ──────────────────────────────────────────────────────
export function toast(msg, type = 'info') {
  const el = document.getElementById('toast')
  if (!el) return
  const colors = {
    info:    'bg-zinc-800 border-zinc-700 text-zinc-100',
    success: 'bg-emerald-900 border-emerald-700 text-emerald-100',
    error:   'bg-red-900 border-red-700 text-red-100',
  }
  el.className = `fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl
    transition-all duration-300 border max-w-xs ${colors[type] || colors.info}`
  el.textContent = msg
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  el.style.pointerEvents = 'auto'
  clearTimeout(el._t)
  el._t = setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    el.style.pointerEvents = 'none'
  }, 2800)
}

// ── Theme ─────────────────────────────────────────────────────
let theme = localStorage.getItem('dfc_theme') || 'dark'

export function applyTheme() {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = theme === 'light' ? '🌙' : '☀️'
  })
  localStorage.setItem('dfc_theme', theme)
}

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme()
}
