import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fuilqexzgdrlhwetlwrj.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aWxxZXh6Z2RybGh3ZXRsd3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTg5MDcsImV4cCI6MjA5MDQ5NDkwN30.JlpjSUBQSbHMA2R6jSvbOxipAHbsT6SOPSRcejfoNAE'

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Auth helpers ─────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  })
  if (error) throw error
  return data
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#/app'
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

// ── Company helpers ──────────────────────────────────────────
export async function listCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createCompany(company) {
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCompany(id, updates) {
  const { data, error } = await supabase
    .from('companies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCompany(id) {
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw error
}

// ── User management ──────────────────────────────────────────
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(name, slug)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Blends (cloud storage) ───────────────────────────────────
export async function listBlends(companyId) {
  const { data, error } = await supabase
    .from('blends')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveBlendToDB(blend) {
  const { data, error } = await supabase
    .from('blends')
    .upsert(blend, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlendFromDB(id) {
  const { error } = await supabase.from('blends').delete().eq('id', id)
  if (error) throw error
}

// ── Logo upload ─────────────────────────────────────────────
export async function uploadLogo(file, companySlug) {
  const ext = file.name.split('.').pop()
  const path = `${companySlug}/logo.${ext}`
  // Remove old logo first
  await supabase.storage.from('logos').remove([path])
  const { error } = await supabase.storage.from('logos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}

// ── Admin: blends by company ────────────────────────────────
export async function listAllBlends() {
  const { data, error } = await supabase
    .from('blends')
    .select('*, companies(name)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listBlendsForCompany(companyId) {
  const { data, error } = await supabase
    .from('blends')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Invite user (Supabase inviteUserByEmail requires service role, so we use signUp) ──
export async function inviteUser(email, fullName, companyId, role = 'user') {
  // Generate a temp password — user will reset via email
  const tempPass = crypto.randomUUID().slice(0, 16)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: tempPass,
    options: { data: { full_name: fullName } }
  })
  if (error) throw error
  // Update profile with company and role
  if (data.user) {
    // Wait briefly for trigger to create profile
    await new Promise(r => setTimeout(r, 1000))
    await supabase
      .from('profiles')
      .update({ company_id: companyId, role })
      .eq('user_id', data.user.id)
  }
  return data
}

// ── Feature Requests ────────────────────────────────────────
export async function listFeatureRequests() {
  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createFeatureRequest(request) {
  const { data, error } = await supabase
    .from('feature_requests')
    .insert({ ...request, status: 'Approved' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFeatureRequest(id, updates) {
  const { data, error } = await supabase
    .from('feature_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFeatureRequest(id) {
  const { error } = await supabase.from('feature_requests').delete().eq('id', id)
  if (error) throw error
}

// ── Crop Library ───────────────────────────────────────────
export async function listCrops() {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

// ── Fields ─────────────────────────────────────────────────
export async function listFields(companyId) {
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data
}

export async function createField(field) {
  const { data, error } = await supabase
    .from('fields')
    .insert(field)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateField(id, updates) {
  const { data, error } = await supabase
    .from('fields')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteField(id) {
  const { error } = await supabase.from('fields').delete().eq('id', id)
  if (error) throw error
}

export async function uploadFieldFile(fieldId, file, type) {
  const ext = file.name.split('.').pop()
  const path = `${fieldId}/${type}-${Date.now()}.${ext}`
  const { error: uploadErr } = await supabase.storage.from('field-files').upload(path, file)
  if (uploadErr) throw uploadErr
  const col = type === 'boundary' ? { boundary_file_path: path, boundary_file_name: file.name } : { soil_sample_file_path: path, soil_sample_file_name: file.name }
  await updateField(fieldId, col)
  return path
}

export async function getFieldFileUrl(path) {
  const { data, error } = await supabase.storage.from('field-files').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteFieldFile(fieldId, path, type) {
  await supabase.storage.from('field-files').remove([path])
  const col = type === 'boundary' ? { boundary_file_path: null, boundary_file_name: null } : { soil_sample_file_path: null, soil_sample_file_name: null }
  await updateField(fieldId, col)
}

// ── Soil Tests ─────────────────────────────────────────────
export async function listSoilTests(companyId, fieldId = null) {
  let q = supabase.from('soil_tests').select('*').eq('company_id', companyId)
  if (fieldId) q = q.eq('field_id', fieldId)
  const { data, error } = await q.order('test_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createSoilTest(test) {
  const { data, error } = await supabase
    .from('soil_tests')
    .insert(test)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSoilTest(id, updates) {
  const { data, error } = await supabase
    .from('soil_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSoilTest(id) {
  const { error } = await supabase.from('soil_tests').delete().eq('id', id)
  if (error) throw error
}

// ── Field Applications ─────────────────────────────────────
export async function listFieldApplications(companyId, fieldId = null) {
  let q = supabase.from('field_applications').select('*').eq('company_id', companyId)
  if (fieldId) q = q.eq('field_id', fieldId)
  const { data, error } = await q.order('application_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createFieldApplication(app) {
  const { data, error } = await supabase
    .from('field_applications')
    .insert(app)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFieldApplication(id) {
  const { error } = await supabase.from('field_applications').delete().eq('id', id)
  if (error) throw error
}

// ── Application Plans ──────────────────────────────────────
export async function listApplicationPlans(companyId, fieldId = null) {
  let q = supabase.from('application_plans').select('*').eq('company_id', companyId)
  if (fieldId) q = q.eq('field_id', fieldId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createApplicationPlan(plan) {
  const { data, error } = await supabase
    .from('application_plans')
    .insert(plan)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateApplicationPlan(id, updates) {
  const { data, error } = await supabase
    .from('application_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteApplicationPlan(id) {
  const { error } = await supabase.from('application_plans').delete().eq('id', id)
  if (error) throw error
}

// ── Inventory ──────────────────────────────────────────────
export async function listInventory(companyId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', companyId)
    .order('product_name')
  if (error) throw error
  return data
}

export async function upsertInventory(item) {
  const { data, error } = await supabase
    .from('inventory')
    .upsert({ ...item, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from('inventory').delete().eq('id', id)
  if (error) throw error
}

// ── Spreader Settings ──────────────────────────────────────
export async function listSpreaders(companyId) {
  const { data, error } = await supabase
    .from('spreader_settings')
    .select('*')
    .eq('company_id', companyId)
    .order('equipment_name')
  if (error) throw error
  return data
}

export async function upsertSpreader(item) {
  const { data, error } = await supabase
    .from('spreader_settings')
    .upsert({ ...item, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSpreader(id) {
  const { error } = await supabase.from('spreader_settings').delete().eq('id', id)
  if (error) throw error
}

// ── Admin User Actions (requires super_admin, uses Edge Function) ──
async function callAdminUserAction(action, params = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-user-actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Admin action failed')
  return json
}

export async function adminListUsers() {
  const { users } = await callAdminUserAction('list_users')
  return users
}

export async function adminDeleteUser(userId) {
  return callAdminUserAction('delete_user', { user_id: userId })
}

export async function adminSendPasswordReset(email) {
  return callAdminUserAction('reset_password', { email })
}
