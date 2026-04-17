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

type Match = {
  id: string
  etape: string
  concours_ab: string
  statut: string
  score1: number | null
  score2: number | null
  equipe1: { id: string; nom_equipe: string }
  equipe2: { id: string; nom_equipe: string }
}

export default function OrganisateurPage() {
  const [concours, setConcours] = useState<Concours[]>([])
  const [concoursSelectionne, setConcoursSelectionne] = useState<Concours | null>(null)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [matchs, setMatchs] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [onglet, setOnglet] = useState<'inscrits' | 'matchs'>('inscrits')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [modifierConcours, setModifierConcours] = useState(false)
  const [scoreEnCours, setScoreEnCours] = useState<{ matchId: string; score1: string; score2: string } | null>(null)
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

  async function selectionnerConcours(c: Concours) {
    setConcoursSelectionne(c)
    setAfficherFormulaire(false)
    setModifierConcours(false)
    setMessage(null)
    await chargerInscriptions(c.id)
    await chargerMatchs(c.id)
  }

  async function chargerInscriptions(concoursId: string) {
    const { data } = await supabase
      .from('inscriptions')
      .select('*, joueurs(nom, prenom, telephone)')
      .eq('concours_id', concoursId)
      .order('inscrit_le', { ascending: true })
    if (data) setInscriptions(data)
  }

  async function chargerMatchs(concoursId: string) {
    const { data } = await supabase
      .from('matchs')
      .select('*, equipe1:equipe1_id(id, nom_equipe), equipe2:equipe2_id(id, nom_equipe)')
      .eq('concours_id', concoursId)
      .order('created_at', { ascending: true })
    if (data) setMatchs(data as any)
  }

  async function validerPaiement(inscriptionId: string) {
    await supabase
      .from('inscriptions')
      .update({ statut_paiement: 'confirme' })
      .eq('id', inscriptionId)
    if (concoursSelectionne) chargerInscriptions(concoursSelectionne.id)
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
        setMessage({ type: 'erreur', texte: 'Aucun club trouve.' })
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

      setMessage({ type: 'succes', texte: 'Concours cree !' })
      setAfficherFormulaire(false)
      setForm({ nom: '', format: 'doublette', date_concours: '', mise_entree: '10', nb_terrains: '20', consolante_active: false })
      await chargerConcours()

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Erreur.' })
    }
    setLoading(false)
  }

  async function sauvegarderModification(e: React.FormEvent) {
    e.preventDefault()
    if (!concoursSelectionne) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('concours')
        .update({
          nom: form.nom,
          format: form.format,
          date_concours: form.date_concours,
          mise_entree: parseFloat(form.mise_entree),
          nb_terrains: parseInt(form.nb_terrains),
          consolante_active: form.consolante_active,
        })
        .eq('id', concoursSelectionne.id)

      if (error) throw error

      setMessage({ type: 'succes', texte: 'Concours modifie !' })
      setModifierConcours(false)
      await chargerConcours()

    } catch (err: any) {
      setMessage({ type: 'erreur', texte: err.message || 'Erreur.' })
    }
    setLoading(false)
  }

  async function annulerConcours() {
    if (!concoursSelectionne) return
    if (!confirm('Etes-vous sur de vouloir annuler ce concours ?')) return
    setLoading(true)

    const { error } = await supabase
      .from('concours')
      .update({ statut: 'annule' })
      .eq('id', concoursSelectionne.id)

    if (!error) {
      setMessage({ type: 'succes', texte: 'Concours annule.' })
      setConcoursSelectionne(null)
      await chargerConcours()
    }
    setLoading(false)
  }

  async function soumettreScore(matchId: string) {
    if (!scoreEnCours) return
    const s1 = parseInt(scoreEnCours.score1)
    const s2 = parseInt(scoreEnCours.score2)

    if (isNaN(s1) || isNaN(s2)) {
      setMessage({ type: 'erreur', texte: 'Scores invalides.' })
      return
    }
    if (s1 === s2) {
      setMessage({ type: 'erreur', texte: 'Les scores ne peuvent pas etre egaux.' })
      return
    }

    const match = matchs.find(m => m.id === matchId)
    if (!match) return

    const perdantId = s1 > s2 ? match.equipe2.id : match.equipe1.id

    await supabase
      .from('matchs')
      .update({
        score1: s1,
        score2: s2,
        statut: 'termine',
        termine_le: new Date().toISOString(),
      })
      .eq('id', matchId)

    await supabase
      .from('equipes')
      .update({ statut: 'eliminee' })
      .eq('id', perdantId)

    setMessage({ type: 'succes', texte: 'Score enregistre !' })
    setScoreEnCours(null)
    if (concoursSelectionne) await chargerMatchs(concoursSelectionne.id)
  }

  async function corrigerScore(matchId: string) {
    if (!scoreEnCours) return
    const s1 = parseInt(scoreEnCours.score1)
    const s2 = parseInt(scoreEnCours.score2)

    if (isNaN(s1) || isNaN(s2) || s1 === s2) {
      setMessage({ type: 'erreur', texte: 'Scores invalides.' })
      return
    }

    const match = matchs.find(m => m.id === matchId)
    if (!match) return

    const ancienPerdantId = (match.score1 || 0) > (match.score2 || 0) ? match.equipe2.id : match.equipe1.id
    const nouveauPerdantId = s1 > s2 ? match.equipe2.id : match.equipe1.id
    const nouveauGagnantId = s1 > s2 ? match.equipe1.id : match.equipe2.id

    await supabase
      .from('matchs')
      .update({ score1: s1, score2: s2, statut: 'termine', termine_le: new Date().toISOString() })
      .eq('id', matchId)

    await supabase.from('equipes').update({ statut: 'eliminee' }).eq('id', nouveauPerdantId)
    await supabase.from('equipes').update({ statut: 'active' }).eq('id', nouveauGagnantId)

    setMessage({ type: 'succes', texte: 'Score corrige !' })
    setScoreEnCours(null)
    if (concoursSelectionne) await chargerMatchs(concoursSelectionne.id)
  }

  const nbConfirmes = inscriptions.filter(i => i.statut_paiement === 'confirme').length
  const nbEnAttente = inscriptions.filter(i => i.statut_paiement === 'en_attente').length

  const etapeLabel: Record<string, string> = {
    cadrage: 'Cadrage',
    '32e': '32e de finale',
    '16e': '16e de finale',
    '8e': '8e de finale',
    quart: 'Quart de finale',
    demi: 'Demi-finale',
    finale: 'Finale',
  }

  const formulaireConcours = (onSubmit: (e: React.FormEvent) => void, titre: string) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4 pt-4 border-t border-gray-100">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du concours *</label>
        <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
          placeholder="Concours Doublette Printemps"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
        <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="tete_a_tete">Tete-a-tete</option>
          <option value="doublette">Doublette</option>
          <option value="triplette">Triplette</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
        <input type="date" value={form.date_concours} onChange={(e) => setForm({ ...form, date_concours: e.target.value })}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mise (€)</label>
          <input type="number" value={form.mise_entree} onChange={(e) => setForm({ ...form, mise_entree: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nb terrains</label>
          <input type="number" value={form.nb_terrains} onChange={(e) => setForm({ ...form, nb_terrains: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="consolante" checked={form.consolante_active}
          onChange={(e) => setForm({ ...form, consolante_active: e.target.checked })} className="w-4 h-4 text-blue-600" />
        <label htmlFor="consolante" className="text-sm font-medium text-gray-700">Activer le concours B</label>
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors">
        {loading ? 'Sauvegarde...' : titre}
      </button>
    </form>
  )

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
            message.type === 'succes' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>{message.texte}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Concours</h2>
            <button
              onClick={() => { setAfficherFormulaire(!afficherFormulaire); setConcoursSelectionne(null); setModifierConcours(false) }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              {afficherFormulaire ? 'Annuler' : '+ Nouveau concours'}
            </button>
          </div>

          {afficherFormulaire && formulaireConcours(creerConcours, 'Creer le concours')}

          {!afficherFormulaire && (
            <div className="space-y-2">
              {concours.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun concours.</p>}
              {concours.map((c) => (
                <button key={c.id} onClick={() => selectionnerConcours(c)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    concoursSelectionne?.id === c.id ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.nom}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      c.statut === 'ouvert' ? 'bg-green-100 text-green-800' :
                      c.statut === 'annule' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>{c.statut}</span>
                  </div>
                  <div className="text-sm opacity-70">{new Date(c.date_concours).toLocaleDateString('fr-FR')} · {c.format} · {c.mise_entree}€</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {concoursSelectionne && !afficherFormulaire && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-gray-100">
              <div className="flex gap-2">
                <button onClick={() => { setModifierConcours(!modifierConcours); setForm({ nom: concoursSelectionne.nom, format: concoursSelectionne.format, date_concours: concoursSelectionne.date_concours, mise_entree: String(concoursSelectionne.mise_entree), nb_terrains: String(concoursSelectionne.nb_terrains), consolante_active: concoursSelectionne.consolante_active }) }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-xl transition-colors">
                  {modifierConcours ? 'Annuler' : 'Modifier le concours'}
                </button>
                <button onClick={annulerConcours}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium py-2 rounded-xl transition-colors">
                  Annuler le concours
                </button>
              </div>
              {modifierConcours && formulaireConcours(sauvegarderModification, 'Sauvegarder les modifications')}
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setOnglet('inscrits')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${onglet === 'inscrits' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                Inscrits ({inscriptions.length})
              </button>
              <button onClick={() => setOnglet('matchs')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${onglet === 'matchs' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                Matchs ({matchs.length})
              </button>
            </div>

            {onglet === 'inscrits' && (
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
                    <h2 className="font-bold text-gray-900">Inscrits ({inscriptions.length})</h2>
                  </div>
                  {inscriptions.length === 0 && <div className="text-center text-gray-400 py-8">Aucun inscrit.</div>}
                  <div className="divide-y divide-gray-100">
                    {inscriptions.map((inscription) => (
                      <div key={inscription.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{inscription.joueurs?.prenom} {inscription.joueurs?.nom}</div>
                          <div className="text-sm text-gray-500">{inscription.joueurs?.telephone || 'Pas de telephone'}</div>
                        </div>
                        {inscription.statut_paiement === 'confirme' ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">Paye</span>
                        ) : (
                          <button onClick={() => validerPaiement(inscription.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
                            Valider paiement
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {onglet === 'matchs' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Tous les matchs</h2>
                </div>
                {matchs.length === 0 && <div className="text-center text-gray-400 py-8">Aucun match. Lancez le tirage.</div>}
                <div className="divide-y divide-gray-100">
                  {matchs.map((match) => (
                    <div key={match.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">{etapeLabel[match.etape]}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          match.statut === 'termine' ? 'bg-green-100 text-green-800' :
                          match.statut === 'en_attente_confirmation' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {match.statut === 'termine' ? 'Termine' : match.statut === 'en_attente_confirmation' ? 'En attente confirmation' : 'En attente'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-medium text-gray-800 flex-1">{match.equipe1?.nom_equipe}</span>
                        {match.statut === 'termine' ? (
                          <span className="text-lg font-bold text-gray-900">{match.score1} — {match.score2}</span>
                        ) : (
                          <span className="text-sm text-gray-400 font-medium">VS</span>
                        )}
                        <span className="font-medium text-gray-800 flex-1 text-right">{match.equipe2?.nom_equipe}</span>
                      </div>

                      {scoreEnCours?.matchId === match.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">{match.equipe1?.nom_equipe}</p>
                              <input type="number" min="0" max="13" value={scoreEnCours.score1}
                                onChange={(e) => setScoreEnCours({ ...scoreEnCours, score1: e.target.value })}
                                placeholder="0"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <span className="text-gray-400 font-bold mt-5">—</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1 text-right">{match.equipe2?.nom_equipe}</p>
                              <input type="number" min="0" max="13" value={scoreEnCours.score2}
                                onChange={(e) => setScoreEnCours({ ...scoreEnCours, score2: e.target.value })}
                                placeholder="0"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setScoreEnCours(null)}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-xl">
                              Annuler
                            </button>
                            <button onClick={() => match.statut === 'termine' ? corrigerScore(match.id) : soumettreScore(match.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-xl">
                              {match.statut === 'termine' ? 'Corriger' : 'Valider'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setScoreEnCours({ matchId: match.id, score1: String(match.score1 || ''), score2: String(match.score2 || '') })}
                          className={`w-full text-sm font-medium py-2 rounded-xl transition-colors ${
                            match.statut === 'termine'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}>
                          {match.statut === 'termine' ? 'Corriger le score' : 'Saisir le score'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}