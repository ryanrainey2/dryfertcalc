import { signIn, signUp, resetPassword, supabase, signOut } from '../supabase.js'
import { navigate } from '../router.js'
import { toast, icon, friendlyError } from '../ui.js'

export function renderLogin() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="min-h-screen flex">
      <!-- Left panel — brand -->
      <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style="background:var(--color-surface);border-right:1px solid var(--color-border);">
        <div>
          <div class="flex items-center gap-3 mb-16">
            ${icon('wheat', 'icon-lg')}
            <span class="text-lg font-semibold" style="letter-spacing:-0.02em;">FertCalc Pro</span>
          </div>
          <h2 class="text-4xl font-bold leading-tight" style="letter-spacing:-0.03em;max-width:420px;">Precision fertilizer blending, simplified.</h2>
          <p class="mt-4 text-base" style="color:var(--color-text-secondary);max-width:380px;line-height:1.6;">Optimize nutrient rates, generate quotes, and manage blends — all in one tool built for ag retailers.</p>
        </div>
        <p class="text-xs" style="color:var(--color-text-muted);">&copy; 2026 FertCalc Pro</p>
      </div>

      <!-- Right panel — auth form -->
      <div class="flex-1 flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-sm">
          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center gap-2.5 mb-10">
            ${icon('wheat', 'icon-lg')}
            <span class="text-lg font-semibold" style="letter-spacing:-0.02em;">FertCalc Pro</span>
          </div>

          <form id="loginForm" class="space-y-4">
            <div class="mb-6">
              <h1 class="text-xl font-bold" style="letter-spacing:-0.02em;">Sign in</h1>
              <p class="text-sm mt-1" style="color:var(--color-text-muted);">Enter your credentials to continue</p>
            </div>
            <div>
              <label class="lbl">Email</label>
              <input id="loginEmail" type="email" required class="inp" placeholder="you@company.com" />
            </div>
            <div>
              <label class="lbl">Password</label>
              <input id="loginPassword" type="password" required class="inp" placeholder="••••••••" />
            </div>
            <button type="submit" id="btnLogin" class="btn btn-primary w-full justify-center py-2.5">Sign In</button>
            <div class="text-center mt-2">
              <button type="button" id="btnForgotPassword" class="text-xs cursor-pointer bg-transparent border-none" style="color:var(--color-text-muted);">
                Forgot password?
              </button>
            </div>
          </form>

          <div class="text-center mt-5">
            <button id="btnToggleSignup" class="text-xs cursor-pointer bg-transparent border-none" style="color:var(--color-text-muted);">
              Need an account? <span style="color:var(--color-accent);">Sign up</span>
            </button>
          </div>

          <!-- Signup fields (hidden by default) -->
          <form id="signupForm" class="space-y-4 hidden mt-4">
            <div class="mb-6">
              <h1 class="text-xl font-bold" style="letter-spacing:-0.02em;">Create account</h1>
              <p class="text-sm mt-1" style="color:var(--color-text-muted);">Fill in your details to get started</p>
            </div>
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
            <button type="submit" id="btnSignup" class="btn btn-primary w-full justify-center py-2.5">Create Account</button>
            <div class="text-center">
              <button id="btnToggleLogin" type="button" class="text-xs cursor-pointer bg-transparent border-none" style="color:var(--color-text-muted);">
                Already have an account? <span style="color:var(--color-accent);">Sign in</span>
              </button>
            </div>
          </form>

          <!-- Email verification message (hidden by default) -->
          <div id="verifyEmailMsg" class="hidden mt-6 text-center space-y-3">
            <div class="mx-auto w-12 h-12 rounded-xl flex items-center justify-center" style="background:var(--color-accent-subtle);">
              ${icon('check', 'icon-lg')}
            </div>
            <h3 class="font-semibold" style="color:var(--color-accent);">Check Your Email</h3>
            <p class="text-sm" style="color:var(--color-text-secondary);">We sent a verification link to <span id="verifyEmailAddr" class="font-medium" style="color:var(--color-text-primary);"></span></p>
            <p class="text-xs" style="color:var(--color-text-muted);">Click the link in the email to verify your address. After verification, an administrator will review and activate your account.</p>
            <p class="text-xs mt-2" style="color:var(--color-text-muted);">Didn't get it? Check your spam folder.</p>
            <button id="btnBackToLogin" type="button" class="btn btn-ghost w-full justify-center py-2 mt-2">${icon('arrow-left', 'icon-sm')} Back to Sign In</button>
          </div>

          <!-- Pending approval message (hidden by default) -->
          <div id="pendingApprovalMsg" class="hidden mt-6 text-center space-y-3">
            <div class="mx-auto w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(245,158,11,0.12);">
              ${icon('info', 'icon-lg')}
            </div>
            <h3 class="font-semibold" style="color:var(--color-warning);">Pending Approval</h3>
            <p class="text-sm" style="color:var(--color-text-secondary);">Your account is verified but waiting for administrator approval.</p>
            <p class="text-xs" style="color:var(--color-text-muted);">You'll receive an email once your account has been activated.</p>
            <button id="btnBackFromPending" type="button" class="btn btn-ghost w-full justify-center py-2 mt-2">${icon('arrow-left', 'icon-sm')} Back to Sign In</button>
          </div>

          <div class="lg:hidden text-center mt-8 text-xs" style="color:var(--color-text-muted);">
            &copy; 2026 FertCalc Pro
          </div>
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
      toast(friendlyError(err), 'error')
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
      toast(friendlyError(err), 'error')
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
