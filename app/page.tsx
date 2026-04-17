'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InscriptionPage() {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    club: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!form.nom || !form.prenom || !form.telephone) {
      setMessage({ type: 'erreur', texte: 'Merci de remplir tous les champs obligatoires.' })
      setLoading(false)
      return
    }

    const telPropre = form.telephone.replace(/\s/g, '')
    if (!/^(\+33|0)[0-9]{9}$/.test(telPropre)) {
      setMessage({ type: 'erreur', texte: 'Numéro de téléphone invalide. Ex: 0612345678' })
      setLoading(false)
      return
    }

    try {
      const { data: joueurExistant } = await supabase
        .from('joueurs')
        .select('id')
        .eq('telephone', telPropre)
        .single()

      if (joueurExistant) {
        setMessage({ type: 'erreur', texte: 'Ce numéro de téléphone est déjà enregistré.' })
        setLoading(false)
        return
      }

      const { error } = await supabase.from('joueurs').insert({
        nom: form.nom.toUpperCase(),
        prenom: form.prenom,
        telephone: telPropre,
        num_licence: form.club,
      })

      if (error) throw error

      setMessage({ type: 'succes', texte: `Bienvenue ${form.prenom} ! Votre compte est créé.` })
      setForm({ nom: '', prenom: '', telephone: '', club: '' })

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || JSON.stringify(err) })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Créez votre compte joueur</p>
        </div>

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
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              placeholder="DUPONT"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="prenom"
              value={form.prenom}
              onChange={handleChange}
              placeholder="Jean"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="0612345678"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Utilisé pour recevoir vos notifications WhatsApp</p>
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
              placeholder="Pétanque Club Marseille"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Votre numéro de téléphone est votre identifiant unique
        </p>

      </div>
    </main>
  )
}