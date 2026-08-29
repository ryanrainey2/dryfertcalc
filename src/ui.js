// ── Icons ─────────────────────────────────────────────────────
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="/icons.svg#${name}"/></svg>`
}

// ── Toast ──────────────────────────────────────────────────────
export function toast(msg, type = 'info') {
  const el = document.getElementById('toast')
  if (!el) return
  const colors = {
    info:    'toast-info',
    success: 'toast-success',
    error:   'toast-error',
  }
  el.className = `toast ${colors[type] || colors.info}`
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
    btn.innerHTML = icon(theme === 'light' ? 'moon' : 'sun', 'icon-sm')
  })
  localStorage.setItem('dfc_theme', theme)
}

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark'
  applyTheme()
}
