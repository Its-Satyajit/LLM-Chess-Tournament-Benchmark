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
      setSelectedModels([])
    } catch {
      setMatchResult({ ok: false, text: 'Error creating match — check the server and try again.' })
    } finally {
      setStartingMatch(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4">Models</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Model name"
              value={newModel.name}
              onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            />
            <input
              type="text"
              placeholder="Provider"
              value={newModel.provider}
              onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            />
            <button
              onClick={addModel}
              disabled={addingModel}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 rounded px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              {addingModel ? 'Adding...' : 'Add'}
            </button>
          </div>
          {modelError && <p className="mb-2 text-sm text-red-400">{modelError}</p>}
          <div className="space-y-2">
            {modelsState === 'loading' && <p className="text-gray-400 text-sm">Loading models...</p>}
            {modelsState === 'error' && (
              <div className="text-sm">
                <p className="text-red-400 mb-2">Failed to load models.</p>
                <button
                  onClick={loadModels}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                >
                  Retry
                </button>
              </div>
            )}
            {modelsState === 'loaded' && models.length === 0 && (
              <p className="text-gray-500 text-sm">No models yet — add one above to get started.</p>
            )}
            {models.map((m, i) => (
              <button
                key={i}
                onClick={() => toggleModel(i)}
                aria-pressed={selectedModels.includes(i)}
                aria-label={`Select ${m.name} (${m.provider})`}
                title={selectedModels.length >= 2 && !selectedModels.includes(i) ? 'Deselect a model first — max 2' : undefined}
                className={`w-full flex justify-between items-center gap-2 rounded px-3 py-2 cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
                  selectedModels.includes(i) ? 'bg-blue-900 border border-blue-500' : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                }`}
              >
                <span className="truncate" title={m.name}>{m.name}</span>
                <span className="text-gray-400 text-sm shrink-0">{m.provider}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4">Create Match</h3>
          <p className="text-gray-400 mb-4">
            Select 2 models to compete in a 4-game match.
          </p>
          <div className="mb-4 text-sm" id="selection-status">
            {selectedModels.length === 0 && <span className="text-gray-500">No models selected</span>}
            {selectedModels.length === 1 && <span className="text-yellow-400">Select 1 more model</span>}
            {selectedModels.length === 2 && (
              <span className="text-green-400">
                {models[selectedModels[0]].name} vs {models[selectedModels[1]].name}
              </span>
            )}
          </div>
          <button
            onClick={startMatch}
            disabled={selectedModels.length !== 2 || startingMatch}
            aria-describedby="selection-status"
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400 rounded px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            {startingMatch ? 'Creating...' : 'Start Match'}
          </button>
          {matchResult && (
            <p
              role="status"
              className={`mt-4 text-sm text-center break-all ${matchResult.ok ? 'text-green-400' : 'text-red-400'}`}
            >
              {matchResult.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
