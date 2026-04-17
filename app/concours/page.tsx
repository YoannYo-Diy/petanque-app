'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Concours = {
  id: string
  nom: string
  format: string
  date_concours: string
  mise_entree: number
  nb_terrains: number
  consolante_active: boolean
  statut: string
  clubs: { nom: string }
}

export default function ConcoursPage() {
  const [concours, setConcours] = useState<Concours[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from('concours')
        .select('*, clubs(nom)')
        .eq('statut', 'ouvert')
        .order('date_concours', { ascending: true })
      if (data) setConcours(data)
      setLoading(false)
    }
    charger()
  }, [])

  const formatLabel: Record<string, string> = {
    tete_a_tete: 'Tete-a-tete',
    doublette: 'Doublette',
    triplette: 'Triplette',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">

        <div className="text-center mb-8 pt-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
          <p className="text-gray-500 text-sm mt-1">Concours disponibles</p>
        </div>

        {loading && (
          <div className="text-center text-gray-400 py-12">
            Chargement...
          </div>
        )}

        {!loading && concours.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            Aucun concours disponible pour le moment.
          </div>
        )}

        <div className="space-y-4">
          {concours.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">

              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-gray-900">{c.nom}</h2>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  Ouvert
                </span>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                {c.clubs?.nom}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Format</div>
                  <div className="font-medium text-gray-800">{formatLabel[c.format]}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Date</div>
                  <div className="font-medium text-gray-800">
                    {new Date(c.date_concours).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Mise</div>
                  <div className="font-medium text-gray-800">{c.mise_entree} €</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Terrains</div>
                  <div className="font-medium text-gray-800">{c.nb_terrains}</div>
                </div>
              </div>

              {c.consolante_active && (
                <div className="text-xs text-blue-600 mb-4">
                  Concours B activé
                </div>
              )}

              
                <a
                 href={`/concours/id/inscription?id=${c.id}`}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-center transition-colors"
              >
                Inscrire mon equipe
              </a>

            </div>
          ))}
        </div>

      </div>
    </main>
  )
}