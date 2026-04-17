'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { enregistrerNotifications } from '@/lib/notifications'

export default function InscriptionPage() {
  const [form, setForm] = useState({
    nomPrenom: '',
    telephone: '',
    club: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [notifAcceptees, setNotifAcceptees] = useState(false)
  const [demandeNotif, setDemandeNotif] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      setNotifAcceptees(true)
    }
  }, [])

  async function activerNotifications() {
    const subscription = await enregistrerNotifications()
    if (subscription) {
      setNotifAcceptees(true)
      setDemandeNotif(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!form.nomPrenom || !form.telephone) {
      setMessage({ type: 'erreur', texte: 'Merci de remplir tous les champs obligatoires.' })
      setLoading(false)
      return
    }

    const telPropre = form.telephone.replace(/\s/g, '')
    if (!/^(\+33|0)[0-9]{9}$/.test(telPropre)) {
      setMessage({ type: 'erreur', texte: 'Numero de telephone invalide. Ex: 0612345678' })
      setLoading(false)
      return
    }

    const parties = form.nomPrenom.trim().split(' ')
    const nom = parties[0] || form.nomPrenom
    const prenom = parties.slice(1).join(' ') || ''

    try {
      const { data: joueurExistant } = await supabase
        .from('joueurs')
        .select('id')
        .eq('telephone', telPropre)
        .single()

      if (joueurExistant) {
        setMessage({ type: 'erreur', texte: 'Ce numero est deja enregistre.' })
        setLoading(false)
        return
      }

      const { error } = await supabase.from('joueurs').insert({
        nom: nom.toUpperCase(),
        prenom: prenom,
        telephone: telPropre,
        num_licence: form.club,
      })

      if (error) throw error

      setMessage({ type: 'succes', texte: `Bienvenue ${form.nomPrenom} ! Votre compte est cree.` })
      setForm({ nomPrenom: '', telephone: '', club: '' })
      setDemandeNotif(true)

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Une erreur est survenue.' })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Creez votre compte joueur</p>
        </div>

        {!notifAcceptees && !demandeNotif && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-blue-800 mb-1">Activez les notifications</p>
            <p className="text-xs text-blue-700 mb-3">
              Pour recevoir vos convocations de match en temps reel, activez les notifications. Sans ca, vous risquez de rater votre match !
            </p>
            <button
              onClick={activerNotifications}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
            >
              Activer les notifications
            </button>
          </div>
        )}

        {notifAcceptees && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 text-center">
            <p className="text-sm font-medium text-green-800">Notifications activees !</p>
          </div>
        )}

        {demandeNotif && !notifAcceptees && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-amber-800 mb-1">Derniere etape importante !</p>
            <p className="text-xs text-amber-700 mb-3">
              Activez les notifications pour etre averti quand votre match commence.
            </p>
            <button
              onClick={activerNotifications}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-xl transition-colors"
            >
              Activer maintenant
            </button>
          </div>
        )}

        {message && (
          <div className={`rounded-xl p-4 mb-6 text-sm font-medium ${
            message.type === 'succes'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.texte}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom et Prenom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nomPrenom"
              value={form.nomPrenom}
              onChange={handleChange}
              placeholder="DUPONT Jean"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telephone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="0612345678"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Utilise pour les notifications de match</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Club <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              name="club"
              value={form.club}
              onChange={handleChange}
              placeholder="Petanque Club Marseille"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Creation en cours...' : 'Creer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Votre numero de telephone est votre identifiant unique
        </p>

      </div>
    </main>
  )
}