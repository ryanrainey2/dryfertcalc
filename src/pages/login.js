import { signIn, signUp } from '../supabase.js'
import { navigate } from '../router.js'
import { toast } from '../ui.js'

export function renderLogin() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="card p-8 w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="text-4xl mb-2">🌾</div>
          <h1 class="text-xl font-bold">FertCalc Pro</h1>
          <p class="text-xs text-zinc-500 mt-1">Fertilizer Optimizer Platform</p>
        </div>

        <form id="loginForm" class="space-y-4">
          <div>
            <label class="lbl">Email</label>
            <input id="loginEmail" type="email" required class="inp" placeholder="you@company.com" />
          </div>
          <div>
            <label class="lbl">Password</label>
            <input id="loginPassword" type="password" required class="inp" placeholder="••••••••" />
          </div>
          <button type="submit" id="btnLogin" class="btn-green w-full justify-center py-3">Sign In</button>
        </form>

        <div class="text-center mt-4">
          <button id="btnToggleSignup" class="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none">
            Need an account? <span class="text-emerald-400">Sign up</span>
          </button>
        </div>

        <!-- Signup fields (hidden by default) -->
        <form id="signupForm" class="space-y-4 hidden mt-4">
          <div>
            <label class="lbl">Full Name</label>
            <input id="signupName" type="text" required class="inp" placeholder="John Doe" />
          </div>
          <div>
            <label class="lbl">Email</label>
            <input id="signupEmail" type="email" required class="inp" placeholder="you@company.com" />
          </div>
          <div>
            <label class="lbl">Password</label>
            <input id="signupPassword" type="password" required minlength="6" class="inp" placeholder="Min 6 characters" />
          </div>
          <button type="submit" id="btnSignup" class="btn-blue w-full justify-center py-3">Create Account</button>
          <div class="text-center">
            <button id="btnToggleLogin" type="button" class="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none">
              Already have an account? <span class="text-emerald-400">Sign in</span>
            </button>
          </div>
        </form>

        <div class="text-center mt-6 text-xs text-zinc-600">
          © 2026 FertCalc Pro
        </div>
      </div>
    </div>`

  // Toggle between login and signup
  document.getElementById('btnToggleSignup').addEventListener('click', () => {
    document.getElementById('loginForm').classList.add('hidden')
    document.getElementById('signupForm').classList.remove('hidden')
    document.getElementById('btnToggleSignup').classList.add('hidden')
  })

  document.getElementById('btnToggleLogin').addEventListener('click', () => {
    document.getElementById('loginForm').classList.remove('hidden')
    document.getElementById('signupForm').classList.add('hidden')
    document.getElementById('btnToggleSignup').classList.remove('hidden')
  })

  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btnLogin')
    btn.disabled = true; btn.textContent = 'Signing in...'
    try {
      await signIn(
        document.getElementById('loginEmail').value,
        document.getElementById('loginPassword').value
      )
      navigate('/app')
    } catch (err) {
      toast(err.message, 'error')
      btn.disabled = false; btn.textContent = 'Sign In'
    }
  })

  // Signup
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btnSignup')
    btn.disabled = true; btn.textContent = 'Creating account...'
    try {
      await signUp(
        document.getElementById('signupEmail').value,
        document.getElementById('signupPassword').value,
        document.getElementById('signupName').value
      )
      toast('Account created! You can now sign in.', 'success')
      // Switch to login view
      document.getElementById('loginForm').classList.remove('hidden')
      document.getElementById('signupForm').classList.add('hidden')
      document.getElementById('btnToggleSignup').classList.remove('hidden')
      btn.disabled = false; btn.textContent = 'Create Account'
    } catch (err) {
      toast(err.message, 'error')
      btn.disabled = false; btn.textContent = 'Create Account'
    }
  })
}
