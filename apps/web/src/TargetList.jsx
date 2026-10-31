import Portrait from './Portrait.jsx'
export default function TargetList({ targets, found }) {
  return (
    <section className="targets" aria-label="Find these regulars">
      {targets.map((target) => {
        const done = found.some((f) => f.targetId === target.id)
        return (
          <div className={`target ${done ? 'found' : ''}`} key={target.id}>
            <Portrait target={target} />
            <div>
              <small>{done ? '✓ FOUND' : 'WANTED'}</small>
              <strong>{target.name}</strong>
            </div>
          </div>
        )
      })}
    </section>
  )
}
