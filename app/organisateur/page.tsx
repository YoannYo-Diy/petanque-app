'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Inscription = {
  id: string
  statut_paiement: string
  inscrit_le: string
  joueurs: {
    nom: string
    prenom: string
    telephone: string
  }
}

type Concours = {
  id: string
  nom: string
  format: string
  date_concours: string
  mise_entree: number
  statut: string
  nb_terrains: number
  consolante_active: boolean
}

export default function OrganisateurPage() {
  const [concours, setConcours] = useState<Concours[]>([])
  const [concoursSelectionne, setConcoursSelectionne] = useState<string>('')
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    format: 'doublette',
    date_concours: '',
    mise_entree: '10',
    nb_terrains: '20',
    consolante_active: false,
  })

  useEffect(() => {
    chargerConcours()
  }, [])

  async function chargerConcours() {
    const { data } = await supabase
      .from('concours')
      .select('*')
      .order('date_concours', { ascending: true })
    if (data) setConcours(data)
  }

  async function chargerInscriptions(concoursId: string) {
    setLoading(true)
    setConcoursSelectionne(concoursId)
    setAfficherFormulaire(false)
    const { data } = await supabase
      .from('inscriptions')
      .select('*, joueurs(nom, prenom, telephone)')
      .eq('concours_id', concoursId)
      .order('inscrit_le', { ascending: true })
    if (data) setInscriptions(data)
    setLoading(false)
  }

  async function validerPaiement(inscriptionId: string) {
    await supabase
      .from('inscriptions')
      .update({ statut_paiement: 'confirme' })
      .eq('id', inscriptionId)
    chargerInscriptions(concoursSelectionne)
  }

  async function creerConcours(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!form.nom || !form.date_concours) {
      setMessage({ type: 'erreur', texte: 'Merci de remplir tous les champs obligatoires.' })
      setLoading(false)
      return
    }

    try {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single()

      if (!club) {
        setMessage({ type: 'erreur', texte: 'Aucun club trouve. Contactez le support.' })
        setLoading(false)
        return
      }

      const { error } = await supabase.from('concours').insert({
        club_id: club.id,
        nom: form.nom,
        format: form.format,
        date_concours: form.date_concours,
        mise_entree: parseFloat(form.mise_entree),
        nb_terrains: parseInt(form.nb_terrains),
        consolante_active: form.consolante_active,
        structure: 'elimination',
        statut: 'ouvert',
      })

      if (error) throw error

      setMessage({ type: 'succes', texte: 'Concours cree avec succes !' })
      setAfficherFormulaire(false)
      setForm({
        nom: '',
        format: 'doublette',
        date_concours: '',
        mise_entree: '10',
        nb_terrains: '20',
        consolante_active: false,
      })
      await chargerConcours()

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Une erreur est survenue.' })
    }

    setLoading(false)
  }

  const nbConfirmes = inscriptions.filter(i => i.statut_paiement === 'confirme').length
  const nbEnAttente = inscriptions.filter(i => i.statut_paiement === 'en_attente').length

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8 pt-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Interface organisateur</p>
        </div>

        {message && (
          <div className={`rounded-xl p-4 mb-4 text-sm font-medium ${
            message.type === 'succes'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.texte}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Concours</h2>
            <button
              onClick={() => { setAfficherFormulaire(!afficherFormulaire); setConcoursSelectionne('') }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {afficherFormulaire ? 'Annuler' : '+ Nouveau concours'}
            </button>
          </div>

          {afficherFormulaire && (
            <form onSubmit={creerConcours} className="space-y-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du concours <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Concours Doublette Printemps"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tete_a_tete">Tete-a-tete</option>
                  <option value="doublette">Doublette</option>
                  <option value="triplette">Triplette</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date_concours}
                  onChange={(e) => setForm({ ...form, date_concours: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mise (€)</label>
                  <input
                    type="number"
                    value={form.mise_entree}
                    onChange={(e) => setForm({ ...form, mise_entree: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nb terrains</label>
                  <input
                    type="number"
                    value={form.nb_terrains}
                    onChange={(e) => setForm({ ...form, nb_terrains: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="consolante"
                  checked={form.consolante_active}
                  onChange={(e) => setForm({ ...form, consolante_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="consolante" className="text-sm font-medium text-gray-700">
                  Activer le concours B (consolante)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Creation...' : 'Creer le concours'}
              </button>
            </form>
          )}

          {!afficherFormulaire && (
            <div className="space-y-2">
              {concours.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Aucun concours. Creez-en un !</p>
              )}
              {concours.map((c) => (
                <button
                  key={c.id}
                  onClick={() => chargerInscriptions(c.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    concoursSelectionne === c.id
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{c.nom}</div>
                  <div className="text-sm opacity-70">
                    {new Date(c.date_concours).toLocaleDateString('fr-FR')} · {c.format} · {c.mise_entree}€
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {concoursSelectionne && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-green-800">{nbConfirmes}</div>
                <div className="text-sm text-green-600">Payes</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-800">{nbEnAttente}</div>
                <div className="text-sm text-amber-600">En attente</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">
                  Inscrits ({inscriptions.length})
                </h2>
              </div>

              {loading && (
                <div className="text-center text-gray-400 py-8">Chargement...</div>
              )}

              {!loading && inscriptions.length === 0 && (
                <div className="text-center text-gray-400 py-8">Aucun inscrit pour le moment.</div>
              )}

              <div className="divide-y divide-gray-100">
                {inscriptions.map((inscription) => (
                  <div key={inscription.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {inscription.joueurs?.prenom} {inscription.joueurs?.nom}
                      </div>
                      <div className="text-sm text-gray-500">
                        {inscription.joueurs?.telephone || 'Pas de telephone'}
                      </div>
                    </div>
                    <div>
                      {inscription.statut_paiement === 'confirme' ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                          Paye
                        </span>
                      ) : (
                        <button
                          onClick={() => validerPaiement(inscription.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                        >
                          Valider paiement
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </main>
  )
}