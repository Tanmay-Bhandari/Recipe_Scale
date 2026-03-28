(async ()=>{
  try {
    const globalFetch = global.fetch
    let fetchFn = globalFetch
    if (!fetchFn) {
      try {
        const mod = await import('node-fetch')
        fetchFn = mod.default
      } catch (e) {
        console.error('No fetch available and node-fetch not installed')
        process.exit(2)
      }
    }

    const res = await fetchFn('http://localhost:3000/api/daily-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayKey: '2026-03-28', state: { meals: {} }, deviceId: 'test-device' }),
    })
    console.log('STATUS', res.status)
    const text = await res.text()
    console.log(text)
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  }
})()
