import { position } from './api.js'
export default function Scene({ scene, round, targeting, onLoad, onError }) {
  const { surface, image, keyboard, choose, cursorElement, selection, cursor } =
    targeting
  const found = round?.markers || [],
    finished = Boolean(round?.completedAt)
  return (
    <div className="scene-scroll">
      <div
        ref={surface}
        className={`scene ${round ? 'playing' : ''}`}
        tabIndex={round && !finished ? 0 : -1}
        role="group"
        aria-label="Market scene. Arrow keys move the search cursor; Shift moves finely; Enter selects."
        onKeyDown={keyboard}
        onClick={(e) => {
          const r = image.current.getBoundingClientRect()
          choose(position(e.clientX, e.clientY, r), e.clientX, e.clientY)
        }}
      >
        <img
          ref={image}
          src={scene.asset}
          alt="A lantern-lit night market with ceramics, noodle stalls, plants, shoppers and rooftops. Find the four pictured regulars."
          draggable="false"
          onLoad={onLoad}
          onError={onError}
        />
        {found.map((m) => (
          <span
            key={m.targetId}
            className="marker"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            aria-label={`${scene.targets.find((t) => t.id === m.targetId)?.name} found`}
          >
            ✓
          </span>
        ))}
        {round && !finished && (
          <span
            ref={cursorElement}
            className={`cursor ${selection ? 'selected' : ''}`}
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
            }}
          />
        )}
        {!round && (
          <div className="scene-label">
            THE LANTERNS ARE LIT.
            <br />
            <strong>Your search starts here.</strong>
          </div>
        )}
      </div>
    </div>
  )
}
