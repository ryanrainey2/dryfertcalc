import { signIn, signUp, resetPassword, supabase, signOut } from '../supabase.js'
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
          <div class="text-center mt-2">
            <button type="button" id="btnForgotPassword" class="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer bg-transparent border-none">
              Forgot password?
            </button>
          </div>
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

        <!-- Email verification message (hidden by default) -->
        <div id="verifyEmailMsg" class="hidden mt-4 text-center space-y-3">
          <div class="text-4xl">📧</div>
          <h3 class="font-semibold text-emerald-400">Check Your Email</h3>
          <p class="text-sm text-zinc-400">We sent a verification link to <span id="verifyEmailAddr" class="text-zinc-200 font-medium"></span></p>
          <p class="text-xs text-zinc-500">Click the link in the email to verify your address. After verification, an administrator will review and activate your account.</p>
          <p class="text-xs text-zinc-600 mt-2">Didn't get it? Check your spam folder.</p>
          <button id="btnBackToLogin" type="button" class="btn-ghost w-full justify-center py-2 mt-2">← Back to Sign In</button>
        </div>

        <!-- Pending approval message (hidden by default) -->
        <div id="pendingApprovalMsg" class="hidden mt-4 text-center space-y-3">
          <div class="text-4xl">⏳</div>
          <h3 class="font-semibold text-amber-400">Pending Approval</h3>
          <p class="text-sm text-zinc-400">Your account is verified but waiting for administrator approval.</p>
          <p class="text-xs text-zinc-500">You'll receive an email once your account has been activated.</p>
          <button id="btnBackFromPending" type="button" class="btn-ghost w-full justify-center py-2 mt-2">← Back to Sign In</button>
        </div>

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
      const { session } = await signIn(
        document.getElementById('loginEmail').value,
        document.getElementById('loginPassword').value
      )
      // Check if user is approved
      const { data: profile } = await supabase
        .from('profiles')
        .select('approved')
        .eq('user_id', session.user.id)
        .single()

      if (profile && profile.approved === false) {
        await signOut()
        // Show pending approval screen
        document.getElementById('loginForm').classList.add('hidden')
        document.getElementById('btnToggleSignup').classList.add('hidden')
        document.getElementById('pendingApprovalMsg').classList.remove('hidden')
        btn.disabled = false; btn.textContent = 'Sign In'
        return
      }

      navigate('/app')
    } catch (err) {
      const msg = err.message?.includes('Email not confirmed')
        ? 'Please verify your email first — check your inbox for a confirmation link'
        : err.message
      toast(msg, 'error')
      btn.disabled = false; btn.textContent = 'Sign In'
    }
  })

  // Forgot password
  document.getElementById('btnForgotPassword').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim()
    if (!email) { toast('Enter your email first', 'error'); return }
    try {
      await resetPassword(email)
      toast('Password reset email sent — check your inbox', 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
  })

  // Signup — show verification message
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btnSignup')
    btn.disabled = true; btn.textContent = 'Creating account...'
    const email = document.getElementById('signupEmail').value
    const password = document.getElementById('signupPassword').value
    try {
      await signUp(email, password, document.getElementById('signupName').value)
      // Show email verification message
      document.getElementById('signupForm').classList.add('hidden')
      document.getElementById('loginForm').classList.add('hidden')
      document.getElementById('btnToggleSignup').classList.add('hidden')
      document.getElementById('verifyEmailAddr').textContent = email
      document.getElementById('verifyEmailMsg').classList.remove('hidden')
    } catch (err) {
      toast(err.message, 'error')
      btn.disabled = false; btn.textContent = 'Create Account'
    }
  })

  // Back to login from verification screen
  document.getElementById('btnBackToLogin').addEventListener('click', () => {
    document.getElementById('verifyEmailMsg').classList.add('hidden')
    document.getElementById('loginForm').classList.remove('hidden')
    document.getElementById('btnToggleSignup').classList.remove('hidden')
  })

  // Back to login from pending approval screen
  document.getElementById('btnBackFromPending').addEventListener('click', () => {
    document.getElementById('pendingApprovalMsg').classList.add('hidden')
    document.getElementById('loginForm').classList.remove('hidden')
    document.getElementById('btnToggleSignup').classList.remove('hidden')
  })
}
