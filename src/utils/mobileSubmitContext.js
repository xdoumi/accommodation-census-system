const PREFIX = 'mobile_submit_context'

export function buildMobileSubmitContextKey(taskId, assignmentId, identity = 'new') {
  return `${PREFIX}_${taskId || 0}_${assignmentId || 0}_${identity || 'new'}`
}

export function saveMobileSubmitContext(key, context) {
  localStorage.setItem(key, JSON.stringify({ ...context, ts: Date.now() }))
}

export function loadMobileSubmitContext(key) {
  if (!key) return null
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

export function clearMobileSubmitContext(key) {
  if (!key) return
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}
