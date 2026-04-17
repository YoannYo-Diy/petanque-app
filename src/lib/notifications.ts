 export async function enregistrerNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Notifications non supportées')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Permission refusée')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    return subscription
  } catch (error) {
    console.error('Erreur notification:', error)
    return null
  }
}

export async function envoyerNotification(
  subscription: PushSubscription,
  title: string,
  body: string
) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, title, body }),
    })
  } catch (error) {
    console.error('Erreur envoi notification:', error)
  }
}