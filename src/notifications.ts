export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  return Notification.requestPermission()
}

export async function showLocalNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body,
    tag: 'practice-transition',
    vibrate: [200, 100, 200]
  } as NotificationOptions

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return
    } catch {
      // fall through to plain Notification
    }
  }

  try {
    new Notification(title, options)
  } catch {
    // notifications unsupported in this context; silently ignore
  }
}

let wakeLock: WakeLockSentinel | null = null

export async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
  } catch {
    wakeLock = null
  }
}

export async function releaseWakeLock() {
  try {
    await wakeLock?.release()
  } catch {
    // ignore
  }
  wakeLock = null
}
