export function getDeviceId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    let id = window.localStorage.getItem('deviceId')
    if (!id) {
      const gen = (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : null
      id = gen || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      window.localStorage.setItem('deviceId', id)
    }
    return id
  } catch (e) {
    return null
  }
}
