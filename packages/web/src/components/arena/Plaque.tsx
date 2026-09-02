export interface PlaqueProps {
  glyph: string
  name: string
  clock?: number
  toMove: boolean
}

export default function Plaque({ glyph, name, clock, toMove }: PlaqueProps) {
  const low = toMove && clock !== undefined && clock <= 30
  return (
    <div className={`plaque ${toMove ? 'to-move' : ''}`}>
      <span className="who">
        <span className="turn-dot" aria-hidden="true" />
        <span>{glyph} {name}</span>
      </span>
      {clock !== undefined && (
        <span className={`clock ${low ? 'clock-low' : ''}`} aria-label={`${name} clock`}>
          {clock}s
        </span>
      )}
    </div>
  )
}
