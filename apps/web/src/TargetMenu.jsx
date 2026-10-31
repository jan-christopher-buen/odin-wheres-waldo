import Portrait from './Portrait.jsx'
export default function TargetMenu({ targeting, targets, found, busy, guess }) {
  const { selection, closeMenu, menu } = targeting
  if (!selection) return null
  return (
    <div className="menu-backdrop" onClick={closeMenu}>
      <div
        ref={menu}
        className="selection-menu"
        role="dialog"
        aria-label="Who did you find?"
        style={{ left: selection.left, top: selection.top }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            closeMenu()
          }
          if (e.key === 'Tab') {
            const buttons = [
              ...menu.current.querySelectorAll('button:not(:disabled)'),
            ]
            const i = buttons.indexOf(document.activeElement)
            e.preventDefault()
            buttons[
              (i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
            ]?.focus()
          }
        }}
      >
        <strong>Who’s here?</strong>
        {targets
          .filter((t) => !found.some((f) => f.targetId === t.id))
          .map((t) => (
            <button disabled={busy} onClick={() => guess(t.id)} key={t.id}>
              <Portrait target={t} />
              {t.name}
            </button>
          ))}
        <button onClick={closeMenu}>Cancel · Esc</button>
      </div>
    </div>
  )
}
