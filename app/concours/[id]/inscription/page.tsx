 'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Concours = {
  id: string
  nom: string
  format: string
  date_concours: string
  mise_entree: number
  clubs: { nom: string }
}

type JoueurForm = {
  nomPrenom: string
}

function InscriptionForm() {
  const searchParams = useSearchParams()
  const concoursId = searchParams.get('id') || ''
  const [concours, setConcours] = useState<Concours | null>(null)
  const [telephone, setTelephone] = useState('')
  const [joueurs, setJoueurs] = useState<JoueurForm[]>([{ nomPrenom: '' }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)

  useEffect(() => {
    async function charger() {
      if (!concoursId) return
      const { data } = await supabase
        .from('concours')
        .select('*, clubs(nom)')
        .eq('id', concoursId)
        .single()
      if (data) {
        setConcours(data)
        if (data.format === 'doublette') setJoueurs([{ nomPrenom: '' }, { nomPrenom: '' }])
        if (data.format === 'triplette') setJoueurs([{ nomPrenom: '' }, { nomPrenom: '' }, { nomPrenom: '' }])
      }
    }
    charger()
  }, [concoursId])

  function handleJoueurChange(index: number, value: string) {
    const updated = [...joueurs]
    updated[index].nomPrenom = value
    setJoueurs(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    for (const j of joueurs) {
      if (!j.nomPrenom) {
        setMessage({ type: 'erreur', texte: 'Merci de remplir le nom et prenom de tous les joueurs.' })
        setLoading(false)
        return
      }
    }

    const telPropre = telephone.replace(/\s/g, '')
    if (!/^(\+33|0)[0-9]{9}$/.test(telPropre)) {
      setMessage({ type: 'erreur', texte: 'Numero de telephone invalide. Ex: 0612345678' })
      setLoading(false)
      return
    }

    try {
      const joueurIds: string[] = []

      for (let i = 0; i < joueurs.length; i++) {
        const j = joueurs[i]
        const tel = i === 0 ? telPropre : null
        const nomComplet = j.nomPrenom.trim()
        const parties = nomComplet.split(' ')
        const nom = parties[0] || nomComplet
        const prenom = parties.slice(1).join(' ') || ''

        if (tel) {
          const { data: existant } = await supabase
            .from('joueurs')
            .select('id')
            .eq('telephone', tel)
            .single()

          if (existant) {
            joueurIds.push(existant.id)
            continue
          }
        }

        const { data: nouveau, error } = await supabase
          .from('joueurs')
          .insert({
            nom: nom.toUpperCase(),
            prenom: prenom,
            telephone: tel,
          })
          .select('id')
          .single()

        if (error) throw error
        joueurIds.push(nouveau.id)
      }

      const { data: dejaInscrit } = await supabase
        .from('inscriptions')
        .select('id')
        .eq('concours_id', concoursId)
        .eq('joueur_id', joueurIds[0])
        .single()

      if (dejaInscrit) {
        setMessage({ type: 'erreur', texte: 'Ce joueur est deja inscrit a ce concours.' })
        setLoading(false)
        return
      }

      for (const joueurId of joueurIds) {
        await supabase.from('inscriptions').insert({
          concours_id: concoursId,
          joueur_id: joueurId,
          statut_paiement: 'en_attente',
          methode_paiement: 'especes',
        })
      }

      const { data: equipe } = await supabase
        .from('equipes')
        .insert({
          concours_id: concoursId,
          nom_equipe: joueurs.map(j => j.nomPrenom.toUpperCase()).join(' / '),
          concours_type: 'A',
          statut: 'active',
        })
        .select('id')
        .single()

      if (equipe) {
        for (let i = 0; i < joueurIds.length; i++) {
          await supabase.from('membres_equipe').insert({
            equipe_id: equipe.id,
            joueur_id: joueurIds[i],
            position: i + 1,
          })
        }
      }

      setMessage({ type: 'succes', texte: `Equipe inscrite ! Payez les ${concours?.mise_entree}€ en especes le jour du concours.` })
      setJoueurs(joueurs.map(() => ({ nomPrenom: '' })))
      setTelephone('')

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Une erreur est survenue.' })
    }

    setLoading(false)
  }

  const formatLabel: Record<string, string> = {
    tete_a_tete: 'Tete-a-tete',
    doublette: 'Doublette',
    triplette: 'Triplette',
  }

  const joueurLabel = (index: number) => {
    if (concours?.format === 'tete_a_tete') return 'Joueur'
    if (index === 0) return 'Joueur 1 (capitaine)'
    return `Joueur ${index + 1}`
  }

  if (!concours) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Chargement...</div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">

        <div className="text-center mb-6 pt-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900">YoConcours</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{concours.nom}</h2>
          <p className="text-sm text-gray-500 mb-4">{concours.clubs?.nom}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Format</div>
              <div className="font-medium text-gray-800 text-sm">{formatLabel[concours.format]}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Date</div>
              <div className="font-medium text-gray-800 text-sm">
                {new Date(concours.date_concours).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Mise</div>
              <div className="font-medium text-gray-800 text-sm">{concours.mise_entree} €</div>
            </div>
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

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-1">Inscription</h3>
          <p className="text-sm text-gray-500 mb-4">
            Le paiement de {concours.mise_entree}€ se fait en especes le jour du concours.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {joueurs.map((joueur, index) => (
              <div key={index} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">{joueurLabel(index)}</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={joueur.nomPrenom}
                    onChange={(e) => handleJoueurChange(index, e.target.value)}
                    placeholder="Nom Prenom"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {index === 0 && (
                    <div>
                      <input
                        type="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="Telephone (ex: 0612345678)"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Utilise pour les notifications WhatsApp</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800 font-medium">Paiement en especes</p>
              <p className="text-xs text-amber-700 mt-1">
                Remettez {concours.mise_entree}€ a la table de marque le jour du concours.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Inscription en cours...' : 'Confirmer mon inscription'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}

export default function InscriptionConcoursPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Chargement...</div></div>}>
      <InscriptionForm />
    </Suspense>
  )
}
