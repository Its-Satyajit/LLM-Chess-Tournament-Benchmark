import { useEffect, useState } from 'react'
import { createMatch } from '../lib/api'

interface Model {
  id?: string
  name: string
  provider: string
}

export default function Admin() {
  const [models, setModels] = useState<Model[]>([]),
   [newModel, setNewModel] = useState({ name: '', provider: '' }),
   [matchResult, setMatchResult] = useState(''),
   [selectedModels, setSelectedModels] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/admin/models')
      .then(res => res.json())
      .then(data => setModels(data.models || []))
  }, [])

  const addModel = async () => {
    if (newModel.name && newModel.provider) {
      const res = await fetch('/api/admin/models', {
        body: JSON.stringify(newModel),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
       data = await res.json()
      setModels([...models, { id: data.id, name: newModel.name, provider: newModel.provider }])
      setNewModel({ name: '', provider: '' })
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
      setMatchResult('Select exactly 2 models')
      return
    }

    const modelA = models[selectedModels[0]],
     modelB = models[selectedModels[1]]

    try {
      const result = await createMatch(
        { maxOutputTokens: 4096, name: modelA.name, provider: modelA.provider, temperature: 0.7, version: '1.0' },
        { maxOutputTokens: 4096, name: modelB.name, provider: modelB.provider, temperature: 0.7, version: '1.0' }
      )
      setMatchResult(`Match created! ID: ${result.matchId}`)
      setSelectedModels([])
    } catch {
      setMatchResult('Error creating match')
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
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Provider"
              value={newModel.provider}
              onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
            />
            <button onClick={addModel} className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {models.map((m, i) => (
              <div 
                key={i} 
                className={`flex justify-between items-center rounded px-3 py-2 cursor-pointer ${
                  selectedModels.includes(i) ? 'bg-blue-900 border border-blue-500' : 'bg-gray-700'
                }`}
                onClick={() => toggleModel(i)}
              >
                <span>{m.name}</span>
                <span className="text-gray-400 text-sm">{m.provider}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-4">Create Match</h3>
          <p className="text-gray-400 mb-4">
            Select 2 models to compete in a 4-game match.
          </p>
          <div className="mb-4 text-sm">
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
            disabled={selectedModels.length !== 2}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded px-4 py-2"
          >
            Start Match
          </button>
          {matchResult && (
            <p className="mt-4 text-sm text-center">{matchResult}</p>
          )}
        </div>
      </div>
    </div>
  )
}
