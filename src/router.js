// Simple hash-based router
const routes = {}

export function route(path, handler) {
  routes[path] = handler
}

export function navigate(path) {
  window.location.hash = '#' + path
}

export function currentRoute() {
  return window.location.hash.slice(1) || '/login'
}

export function startRouter() {
  function handleRoute() {
    const path = currentRoute()
    // Find matching route
    const handler = routes[path] || routes['/login']
    if (handler) handler()
  }

  window.addEventListener('hashchange', handleRoute)
  handleRoute()
}
