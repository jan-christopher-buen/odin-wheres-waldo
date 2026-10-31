const base = import.meta.env.VITE_API_URL || ''
export async function request(path, { credential, body, signal } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method: body ? 'POST' : 'GET',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(90000)])
      : AbortSignal.timeout(90000),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || 'Connection failed. Please retry.'),
      { status: response.status },
    )
  return data
}
export const position = (clientX, clientY, rect) => ({
  x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
  y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
})
export const time = (ms) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`
