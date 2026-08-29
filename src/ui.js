// ── Icons ─────────────────────────────────────────────────────
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="/icons.svg#${name}"/></svg>`
}

// ── Toast ──────────────────────────────────────────────────────
function dismissToast(el) {
  clearTimeout(el._t)
  el.style.opacity = '0'
  el.style.transform = 'translateY(8px)'
  el.style.pointerEvents = 'none'
}

export function toast(msg, type = 'info') {
  const el = document.getElementById('toast')
  if (!el) return
  const colors = {
    info:    'toast-info',
    success: 'toast-success',
    error:   'toast-error',
  }
  el.className = `toast ${colors[type] || colors.info}`

  if (type === 'error') {
    el.innerHTML = `<span class="toast-msg">${msg}</span><button class="toast-close" aria-label="Dismiss">${icon('x-close', 'icon-sm')}</button>`
    el.querySelector('.toast-close')?.addEventListener('click', () => dismissToast(el), { once: true })
  } else {
    el.innerHTML = `<span class="toast-msg">${msg}</span>`
  }

  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  el.style.pointerEvents = 'auto'
  clearTimeout(el._t)

  // Error toasts persist until dismissed; others auto-dismiss
  if (type !== 'error') {
    el._t = setTimeout(() => dismissToast(el), type === 'success' ? 4000 : 2800)
  }
}

// ── Friendly error messages ───────────────────────────────────
export function friendlyError(err) {
  const msg = typeof err === 'string' ? err : (err?.message || String(err))
  const map = [
    [/JWT expired/i, 'Your session has expired. Please sign in again.'],
    [/refresh_token_not_found/i, 'Your session has expired. Please sign in again.'],
    [/Failed to fetch|NetworkError|net::ERR_/i, 'Network error. Check your connection and try again.'],
    [/duplicate key|unique.*constraint|already exists/i, 'This record already exists. Try a different name.'],
    [/row-level security|permission denied|not authorized/i, 'You do not have permission to perform this action.'],
    [/violates.*constraint/i, 'Invalid data. Please check your inputs and try again.'],
    [/PGRST/i, 'Server error. Please try again or contact support.'],
    [/rate limit|429/i, 'Too many requests. Please wait a moment and try again.'],
    [/timeout|ETIMEDOUT/i, 'The request timed out. Please try again.'],
  ]
  for (const [re, friendly] of map) {
    if (re.test(msg)) return friendly
  }
  return msg
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
