 'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Match = {
  id: string
  etape: string
  concours_ab: string
  statut: string
  score1: number | null
  score2: number | null
  equipe1: { id: string; nom_equipe: string }
  equipe2: { id: string; nom_equipe: string }
  terrain_id: string | null
}

type Concours = {
  id: string
  nom: string
}

export default function ScoresPage() {
  const [concours, setConcours] = useState<Concours[]>([])
  const [concoursSelectionne, setConcoursSelectionne] = useState<string>('')
  const [matchs, setMatchs] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [scoreEnCours, setScoreEnCours] = useState<{ matchId: string; score1: string; score2: string } | null>(null)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from('concours')
        .select('*')
        .order('date_concours', { ascending: true })
      if (data) setConcours(data)
    }
    charger()
  }, [])

  async function chargerMatchs(concoursId: string) {
    setConcoursSelectionne(concoursId)
    setLoading(true)
    const { data } = await supabase
      .from('matchs')
      .select('*, equipe1:equipe1_id(id, nom_equipe), equipe2:equipe2_id(id, nom_equipe)')
      .eq('concours_id', concoursId)
      .neq('statut', 'termine')
      .order('created_at', { ascending: true })
    if (data) setMatchs(data as any)
    setLoading(false)
  }

  async function soumettreScore(matchId: string) {
    if (!scoreEnCours) return
    const s1 = parseInt(scoreEnCours.score1)
    const s2 = parseInt(scoreEnCours.score2)

    if (isNaN(s1) || isNaN(s2)) {
      setMessage({ type: 'erreur', texte: 'Entrez des scores valides.' })
      return
    }

    if (s1 === s2) {
      setMessage({ type: 'erreur', texte: 'Les scores ne peuvent pas etre egaux.' })
      return
    }

    if (s1 > 13 || s2 > 13) {
      setMessage({ type: 'erreur', texte: 'Le score maximum est 13.' })
      return
    }

    setLoading(true)
    const match = matchs.find(m => m.id === matchId)
    if (!match) return

    const gagnantId = s1 > s2 ? match.equipe1.id : match.equipe2.id
    const perdantId = s1 > s2 ? match.equipe2.id : match.equipe1.id

    const { error } = await supabase
      .from('matchs')
      .update({
        score1: s1,
        score2: s2,
        statut: 'en_attente_confirmation',
        saisi_par: match.equipe1.id,
      })
      .eq('id', matchId)

    if (error) {
      setMessage({ type: 'erreur', texte: error.message })
      setLoading(false)
      return
    }

    setMessage({ type: 'succes', texte: `Score soumis ! En attente de confirmation de l'autre equipe.` })
    setScoreEnCours(null)
    await chargerMatchs(concoursSelectionne)
    setLoading(false)
  }

  async function confirmerScore(matchId: string) {
    setLoading(true)
    const match = matchs.find(m => m.id === matchId)
    if (!match) return

    const { error } = await supabase
      .from('matchs')
      .update({
        statut: 'termine',
        termine_le: new Date().toISOString(),
        confirme_par: match.equipe2.id,
      })
      .eq('id', matchId)

    if (error) {
      setMessage({ type: 'erreur', texte: error.message })
      setLoading(false)
      return
    }

    const perdantId = (match.score1 || 0) > (match.score2 || 0) ? match.equipe2.id : match.equipe1.id
    await supabase
      .from('equipes')
      .update({ statut: 'eliminee' })
      .eq('id', perdantId)

    setMessage({ type: 'succes', texte: 'Score confirme ! Le perdant est elimine.' })
    await chargerMatchs(concoursSelectionne)
    setLoading(false)
  }

  const etapeLabel: Record<string, string> = {
    cadrage: 'Cadrage',
    '32e': '32e de finale',
    '16e': '16e de finale',
    '8e': '8e de finale',
    quart: 'Quart de finale',
    demi: 'Demi-finale',
    finale: 'Finale',
  }

  const statutLabel: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    en_attente_confirmation: 'Score soumis',
    litige: 'Litige',
    termine: 'Termine',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8 pt-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Saisie des scores</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3">Selectionnez un concours</h2>
          <div className="space-y-2">
            {concours.map((c) => (
              <button
                key={c.id}
                onClick={() => chargerMatchs(c.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  concoursSelectionne === c.id
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{c.nom}</div>
              </button>
            ))}
          </div>
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

        {concoursSelectionne && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Matchs en cours ({matchs.length})</h2>
            </div>

            {loading && (
              <div className="text-center text-gray-400 py-8">Chargement...</div>
            )}

            {!loading && matchs.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Aucun match en cours.
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {matchs.map((match) => (
                <div key={match.id} className="p-4">

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{etapeLabel[match.etape]}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      match.statut === 'en_attente_confirmation'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {statutLabel[match.statut]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-medium text-gray-800 flex-1">{match.equipe1?.nom_equipe}</span>
                    <span className="text-sm text-gray-400 font-medium">VS</span>
                    <span className="font-medium text-gray-800 flex-1 text-right">{match.equipe2?.nom_equipe}</span>
                  </div>

                  {match.statut === 'en_attente' && scoreEnCours?.matchId !== match.id && (
                    <button
                      onClick={() => setScoreEnCours({ matchId: match.id, score1: '', score2: '' })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                    >
                      Saisir le score
                    </button>
                  )}

                  {match.statut === 'en_attente' && scoreEnCours?.matchId === match.id && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">{match.equipe1?.nom_equipe}</p>
                          <input
                            type="number"
                            min="0"
                            max="13"
                            value={scoreEnCours.score1}
                            onChange={(e) => setScoreEnCours({ ...scoreEnCours, score1: e.target.value })}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <span className="text-gray-400 font-bold mt-5">—</span>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1 text-right">{match.equipe2?.nom_equipe}</p>
                          <input
                            type="number"
                            min="0"
                            max="13"
                            value={scoreEnCours.score2}
                            onChange={(e) => setScoreEnCours({ ...scoreEnCours, score2: e.target.value })}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setScoreEnCours(null)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-xl transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => soumettreScore(match.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                        >
                          Soumettre
                        </button>
                      </div>
                    </div>
                  )}

                  {match.statut === 'en_attente_confirmation' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-4 py-2">
                        <span className="text-2xl font-bold text-gray-900">{match.score1}</span>
                        <span className="text-gray-400">—</span>
                        <span className="text-2xl font-bold text-gray-900">{match.score2}</span>
                      </div>
                      <button
                        onClick={() => confirmerScore(match.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                      >
                        Confirmer le score
                      </button>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

