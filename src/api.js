async function req(path, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(path, opts)
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json()
}

export const listExpenses  = (params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null))
  return req('/api/expenses' + (qs.size ? '?' + qs : ''))
}
export const patchExpense  = (id, body) => req(`/api/expenses/${id}`, 'PATCH', body)
export const getStats      = (month)    => req(`/api/stats${month ? '?month=' + month : ''}`)
export const getSettings   = ()         => req('/api/settings')
export const updateSettings = (body)    => req('/api/settings', 'PATCH', body)
export const deleteExpense  = (id)      => req(`/api/expenses/${id}`, 'DELETE')
