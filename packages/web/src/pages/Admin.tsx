import { useEffect, useState } from 'react'
import { createMatch } from '../lib/api'

interface Model {
  id?: string
  name: string
  provider: string
}

type LoadState = 'loading' | 'loaded' | 'error'

export default function Admin() {
  const [models, setModels] = useState<Model[]>([]),
   [modelsState, setModelsState] = useState<LoadState>('loading'),
   [newModel, setNewModel] = useState({ name: '', provider: '' }),
   [addingModel, setAddingModel] = useState(false),
   [modelError, setModelError] = useState(''),
   [matchResult, setMatchResult] = useState<{ ok: boolean; text: string } | null>(null),
   [createdTokens, setCreatedTokens] = useState<{ white: string; black: string } | null>(null),
   [startingMatch, setStartingMatch] = useState(false),
   [selectedModels, setSelectedModels] = useState<number[]>([])

  const loadModels = () => {
    setModelsState('loading')
    fetch('/api/admin/models')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { models?: Model[] }) => {
        setModels(data.models || [])
        setModelsState('loaded')
      })
      .catch(() => setModelsState('error'))
  }

  useEffect(loadModels, [])

  const addModel = async () => {
    if (!newModel.name || !newModel.provider || addingModel) return
    setAddingModel(true)
    setModelError('')
    try {
      const res = await fetch('/api/admin/models', {
        body: JSON.stringify(newModel),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // SAFETY: our own admin API returns a JSON object with an optional id
      const data = (await res.json()) as { id?: string }
      setModels([...models, { id: data.id, name: newModel.name, provider: newModel.provider }])
      setNewModel({ name: '', provider: '' })
    } catch {
      setModelError('Failed to add model — check the server and try again. Your input is preserved.')
    } finally {
      setAddingModel(false)
    }
  },

   toggleModel = (index: number) => {
    if (selectedModels.includes(index)) {
      setSelectedModels(selectedModels.filter(i => i !== index))
    } else if (selectedModels.length < 2) {
      setSelectedModels([...selectedModels, index])
    }
   },

   startMatch = async () => {
    if (selectedModels.length !== 2) {
      setMatchResult({ ok: false, text: 'Select exactly 2 models' })
      return
    }

    const modelA = models[selectedModels[0]],
     modelB = models[selectedModels[1]]

    setStartingMatch(true)
    try {
      const result = await createMatch(
        { maxOutputTokens: 4096, name: modelA.name, provider: modelA.provider, temperature: 0.7, version: '1.0' },
        { maxOutputTokens: 4096, name: modelB.name, provider: modelB.provider, temperature: 0.7, version: '1.0' },
      )
      if (!result.matchId) {
        const message = 'error' in result && result.error ? String(result.error) : 'Server rejected the match creation'
        setMatchResult({ ok: false, text: `Error creating match: ${message}` })
        return
      }
      setMatchResult({ ok: true, text: `Match created! ID: ${result.matchId}` })
      setCreatedTokens({ white: result.playerAToken, black: result.playerBToken })
      setSelectedModels([])
    } catch {
      setMatchResult({ ok: false, text: 'Error creating match — check the server and try again.' })
    } finally {
      setStartingMatch(false)
    }
  }

  return (
    <>
      <h2>Admin Panel</h2>
      <div className="grid">
        <article className="card">
          <h3>Models</h3>
          <form
            onSubmit={(e) => { e.preventDefault(); void addModel() }}
            style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}
          >
            <label>
              Model name
              <input
                type="text"
                placeholder="e.g., gpt-4o"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              />
            </label>
            <label>
              Provider
              <input
                type="text"
                placeholder="e.g., openai"
                value={newModel.provider}
                onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
              />
            </label>
            <button className="button" type="submit" disabled={addingModel} aria-busy={addingModel}>
              {addingModel ? 'Adding...' : 'Add'}
            </button>
          </form>
          {modelError && <p role="alert"><small>{modelError}</small></p>}
          {modelsState === 'loading' && <p aria-busy="true"><small>Loading models...</small></p>}
          {modelsState === 'error' && (
            <>
              <p role="alert"><small>Failed to load models.</small></p>
              <button className="button" onClick={loadModels}>Retry</button>
            </>
          )}
          {modelsState === 'loaded' && models.length === 0 && (
            <p><small>No models yet — add one above to get started.</small></p>
          )}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {models.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleModel(i)}
                aria-pressed={selectedModels.includes(i)}
                aria-label={`Select ${m.name} (${m.provider})`}
                className="button model-row"
                title={selectedModels.length >= 2 && !selectedModels.includes(i) ? 'Deselect a model first — max 2' : undefined}
              >
                <span style={{ float: "left" }}>{m.name}</span>
                <span style={{ float: "right" }}>{m.provider}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="card">
          <h3>Create Match</h3>
          <p>
            <small>Select 2 models to compete in a 4-game match.</small>
          </p>
          <div id="selection-status" role="status">
            {selectedModels.length === 0 && <p><small>No models selected</small></p>}
            {selectedModels.length === 1 && (
              <p><span className="badge" data-variant="warning">Select 1 more model</span></p>
            )}
            {selectedModels.length === 2 && (
              <p><span className="badge" data-variant="success">
                {models[selectedModels[0]].name} vs {models[selectedModels[1]].name}
              </span></p>
            )}
          </div>
          <button className="button" onClick={startMatch}
            disabled={selectedModels.length !== 2 || startingMatch}
            aria-describedby="selection-status"
            aria-busy={startingMatch}
          >
            {startingMatch ? 'Creating...' : 'Start Match'}
          </button>
          {matchResult && (
            <p role="status" style={{ display: "block", marginTop: "1rem", textAlign: "center" }}>
              <span className="badge" data-variant={matchResult.ok ? "success" : "danger"}>
                {matchResult.text}
              </span>
            </p>
          )}
          {createdTokens && (
            <div style={{ marginTop: "1rem" }}>
              <p><small>Paste these into the Arena prompt card for each side:</small></p>
              <label><small>Player A token (white in game 1)</small>
                <input readOnly value={createdTokens.white} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <label><small>Player B token (black in game 1)</small>
                <input readOnly value={createdTokens.black} onFocus={(e) => e.currentTarget.select()} />
              </label>
            </div>
          )}
        </article>
      </div>
    </>
  )
}
