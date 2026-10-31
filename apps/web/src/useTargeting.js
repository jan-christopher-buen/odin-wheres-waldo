import { useEffect, useRef, useState } from 'react'
export function useTargeting(round, busy) {
  const [selection, setSelection] = useState(null)
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 })
  const image = useRef(null),
    surface = useRef(null),
    menu = useRef(null),
    cursorElement = useRef(null)
  useEffect(() => {
    if (selection) menu.current?.querySelector('button')?.focus()
  }, [selection])
  useEffect(() => {
    if (document.activeElement === surface.current)
      cursorElement.current?.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
      })
  }, [cursor])
  useEffect(() => {
    const close = () => setSelection(null)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])
  function closeMenu() {
    setSelection(null)
    surface.current?.focus({ preventScroll: true })
  }
  function choose(point, clientX, clientY) {
    if (!round || round.completedAt || busy) return
    setCursor(point)
    setSelection({
      point,
      left: Math.max(8, Math.min(window.innerWidth - 252, clientX)),
      top: Math.max(8, Math.min(window.innerHeight - 320, clientY)),
    })
  }
  function keyboard(e) {
    if (!round || round.completedAt) return
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    if (directions[e.key]) {
      e.preventDefault()
      const [x, y] = directions[e.key],
        step = e.shiftKey ? 0.005 : 0.025
      setCursor((p) => ({
        x: Math.max(0, Math.min(1, p.x + x * step)),
        y: Math.max(0, Math.min(1, p.y + y * step)),
      }))
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const r = image.current.getBoundingClientRect()
      choose(cursor, r.left + r.width * cursor.x, r.top + r.height * cursor.y)
    }
  }
  return {
    selection,
    setSelection,
    cursor,
    image,
    surface,
    menu,
    cursorElement,
    closeMenu,
    choose,
    keyboard,
  }
}
