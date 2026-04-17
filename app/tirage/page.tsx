'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Equipe = {
  id: string
  nom_equipe: string
}

type Match = {
  id: string
  equipe1: { nom_equipe: string }
  equipe2: { nom_equipe: string }
  etape: string
  concours_ab: string
  terrain_id: string | null
}

type Concours = {
  id: string
  nom: string
  format: string
  nb_terrains: number
}

export default function TiragePage() {
  const [concours, setConcours] = useState<Concours[]>([])
  const [concoursSelectionne, setConcoursSelectionne] = useState<string>('')
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [matchs, setMatchs] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)

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

  async function chargerEquipes(concoursId: string) {
    setConcoursSelectionne(concoursId)
    setMatchs([])
    setMessage(null)
    const { data } = await supabase
      .from('equipes')
      .select('*')
      .eq('concours_id', concoursId)
      .eq('concours_type', 'A')
      .eq('statut', 'active')
    if (data) setEquipes(data)
    await chargerMatchs(concoursId)
  }

  async function chargerMatchs(concoursId: string) {
    const { data } = await supabase
      .from('matchs')
      .select('*, equipe1:equipe1_id(nom_equipe), equipe2:equipe2_id(nom_equipe)')
      .eq('concours_id', concoursId)
      .order('created_at', { ascending: true })
    if (data) setMatchs(data as any)
  }

  function melangerTableau<T>(tableau: T[]): T[] {
    const t = [...tableau]
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]]
    }
    return t
  }

  function calculerEtape(nbEquipes: number): string {
    if (nbEquipes <= 2) return 'finale'
    if (nbEquipes <= 4) return 'demi'
    if (nbEquipes <= 8) return 'quart'
    if (nbEquipes <= 16) return '8e'
    if (nbEquipes <= 32) return '16e'
    return '32e'
  }

  function calculerNbCadrage(nbEquipes: number): number {
    const puissances = [2, 4, 8, 16, 32, 64, 128]
    if (puissances.includes(nbEquipes)) return 0
    const prochaineP = puissances.find(p => p >= nbEquipes) || 128
    return nbEquipes - (prochaineP / 2)
  }

  async function lancerTirage() {
    if (!concoursSelectionne) return
    setLoading(true)
    setMessage(null)

    try {
      const equipesmelangees = melangerTableau(equipes)
      const nbEquipes = equipesmelangees.length

      if (nbEquipes < 2) {
        setMessage({ type: 'erreur', texte: 'Il faut au moins 2 equipes pour lancer le tirage.' })
        setLoading(false)
        return
      }

      const nbCadrage = calculerNbCadrage(nbEquipes)
      const matchsACreer = []

      if (nbCadrage > 0) {
        const equipesCadrage = equipesmelangees.slice(0, nbCadrage * 2)
        for (let i = 0; i < equipesCadrage.length; i += 2) {
          matchsACreer.push({
            concours_id: concoursSelectionne,
            equipe1_id: equipesCadrage[i].id,
            equipe2_id: equipesCadrage[i + 1].id,
            etape: 'cadrage',
            concours_ab: 'A',
            statut: 'en_attente',
          })
        }
      }

      const equipesDirectes = equipesmelangees.slice(nbCadrage * 2)
      const etape = calculerEtape(nbEquipes)

      for (let i = 0; i < equipesDirectes.length; i += 2) {
        if (equipesDirectes[i + 1]) {
          matchsACreer.push({
            concours_id: concoursSelectionne,
            equipe1_id: equipesDirectes[i].id,
            equipe2_id: equipesDirectes[i + 1].id,
            etape: etape,
            concours_ab: 'A',
            statut: 'en_attente',
          })
        }
      }

      const { error } = await supabase.from('matchs').insert(matchsACreer)
      if (error) throw error

      await chargerMatchs(concoursSelectionne)
      setMessage({ type: 'succes', texte: `Tirage effectue ! ${matchsACreer.length} matchs crees.` })

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Une erreur est survenue.' })
    }

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

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8 pt-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Tirage au sort</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3">Selectionnez un concours</h2>
          <div className="space-y-2">
            {concours.map((c) => (
              <button
                key={c.id}
                onClick={() => chargerEquipes(c.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  concoursSelectionne === c.id
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{c.nom}</div>
                <div className="text-sm opacity-70">{c.format} · {c.nb_terrains} terrains</div>
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

        {concoursSelectionne && equipes.length > 0 && matchs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Equipes inscrites</h2>
                <p className="text-sm text-gray-500">{equipes.length} equipes</p>
              </div>
              <button
                onClick={lancerTirage}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                {loading ? 'Tirage...' : 'Lancer le tirage'}
              </button>
            </div>

            <div className="space-y-2">
              {equipes.map((equipe, index) => (
                <div key={equipe.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-medium text-gray-400 w-6">{index + 1}</span>
                  <span className="font-medium text-gray-800">{equipe.nom_equipe}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {matchs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Tableau du concours ({matchs.length} matchs)</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {matchs.map((match, index) => (
                <div key={match.id} className="p-4">
                  <div className="text-xs text-gray-400 mb-1">{etapeLabel[match.etape]} · Match {index + 1}</div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800 flex-1">{match.equipe1?.nom_equipe}</span>
                    <span className="text-xs text-gray-400 font-medium">VS</span>
                    <span className="font-medium text-gray-800 flex-1 text-right">{match.equipe2?.nom_equipe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}