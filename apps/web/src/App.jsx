import { useEffect, useRef, useState } from 'react'
import { request, time } from './api.js'
import Scene from './Scene.jsx'
import TargetMenu from './TargetMenu.jsx'
import TargetList from './TargetList.jsx'
import { useTargeting } from './useTargeting.js'
const savedCredential = () => sessionStorage.getItem('market-round')
export default function App() {
  const [scene, setScene] = useState(null),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false)
  const [round, setRound] = useState(null),
    [credential, setCredential] = useState(savedCredential),
    [busy, setBusy] = useState(false)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [restoring, setRestoring] = useState(Boolean(credential))
  const [feedback, setFeedback] = useState(''),
    [now, setNow] = useState(Date.now())
  const [board, setBoard] = useState(null),
    [showBoard, setShowBoard] = useState(false),
    [boardError, setBoardError] = useState(''),
    [name, setName] = useState('')
  const completeHeading = useRef(null),
    dialog = useRef(null),
    lock = useRef(false)
  const targeting = useTargeting(round, busy || !loaded || restoring)
  const { selection, setSelection, closeMenu } = targeting
  const loadScene = () => {
    setError('')
    request('/scene')
      .then(setScene)
      .catch((e) => setError(e.message))
  }
  useEffect(() => {
    const controller = new AbortController()
    request('/scene', { signal: controller.signal })
      .then(setScene)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!credential) {
      setRestoring(false)
      return
    }
    setRestoring(true)
    const controller = new AbortController()
    request('/round', { credential, signal: controller.signal })
      .then(setRound)
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message)
          if (e.status === 401 || e.status === 410) {
            sessionStorage.removeItem('market-round')
            setCredential(null)
            setRound(null)
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false)
      })
    return () => controller.abort()
  }, [credential, restoreAttempt])
  useEffect(() => {
    if (!round || round.completedAt) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [round])
  useEffect(() => {
    if (showBoard) dialog.current?.showModal()
    else dialog.current?.close()
  }, [showBoard])
  useEffect(() => {
    if (round?.completedAt) completeHeading.current?.focus()
  }, [round?.completedAt])
  async function start() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const data = await request('/rounds', { body: { sceneId: scene.id } })
      sessionStorage.setItem('market-round', data.credential)
      setCredential(data.credential)
      setRound({ ...data, markers: [] })
      setFeedback('The search is on. Good luck!')
      setNow(Date.now())
      setName('')
      setSelection(null)
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function guess(targetId) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const data = await request('/guesses', {
        credential,
        body: { targetId, ...selection.point },
      })
      setRound(data)
      setFeedback(
        data.correct
          ? 'Found! One more familiar face in the crowd.'
          : 'Not quite. Take another look!',
      )
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
      closeMenu()
    }
  }
  async function scores() {
    setShowBoard(true)
    setBoardError('')
    setBoard(null)
    try {
      setBoard(await request('/leaderboard'))
    } catch (e) {
      setBoardError(e.message)
    }
  }
  async function submit(e) {
    e.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await request('/scores', { credential, body: { name } })
      setRound((r) => ({ ...r, submitted: true }))
      setFeedback('Your time is on the board!')
    } catch (e) {
      setError(e.message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const found = round?.markers || [],
    finished = Boolean(round?.completedAt)
  return (
    <>
      <header>
        <a className="brand" href="/">
          ☾{' '}
          <span>
            MIDNIGHT
            <br />
            MARKET
          </span>
        </a>
        <button className="outline" onClick={scores}>
          The leaderboard ↗
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">A LITTLE SEARCH AFTER DARK · NO. 001</p>
            <h1>
              Somewhere in
              <br />
              the <em>night crowd.</em>
            </h1>
            <p>
              Four peculiar regulars. One bustling market.
              <br />
              Slow down, look closer, and find them all.
            </p>
          </div>
          <div className="ticket">
            <span>YOUR NIGHT SHIFT</span>
            <strong>
              {time(
                finished
                  ? round.elapsedMs
                  : round
                    ? Math.max(0, now - new Date(round.startedAt))
                    : 0,
              )}
            </strong>
            <span>{found.length} / 4 REGULARS FOUND</span>
          </div>
        </section>
        {error && (
          <div className="error" role="alert">
            {error}{' '}
            {!scene && <button onClick={loadScene}>Retry loading</button>}
            {credential && !round && (
              <button
                disabled={restoring}
                onClick={() => {
                  setError('')
                  setRestoreAttempt((n) => n + 1)
                }}
              >
                Retry round
              </button>
            )}
          </div>
        )}
        {!scene ? (
          <p role="status">Opening the market… This can take a minute.</p>
        ) : (
          <>
            <TargetList targets={scene.targets} found={found} />
            <div className="scene-toolbar">
              <span>
                ✦{' '}
                {round
                  ? 'Click a spot, then choose who you found.'
                  : 'Meet the regulars above. Ready to look closer?'}
              </span>
              <button disabled={!loaded || busy || restoring} onClick={start}>
                {busy
                  ? 'Please wait…'
                  : round
                    ? 'New round'
                    : 'Start searching →'}
              </button>
            </div>
            <Scene
              scene={scene}
              round={round}
              targeting={targeting}
              onLoad={() => setLoaded(true)}
              onError={() =>
                setError('Scene image failed to load. Reload to retry.')
              }
            />
            <p className="scene-help">
              ↔ On smaller screens, scroll the illustration sideways. Keyboard:
              arrows to explore · Shift for fine movement · Enter to choose.
            </p>
            <p className="feedback" role="status" aria-live="polite">
              {feedback ||
                (finished
                  ? 'All four regulars found. Thanks for visiting the market!'
                  : round
                    ? 'Your search has resumed. Keep looking!'
                    : 'A moth, a courier, a cat, and a rather unusual teapot await.')}
            </p>
            {finished && (
              <section className="completion" aria-labelledby="complete-title">
                <p className="eyebrow">ALL FOUR, ACCOUNTED FOR.</p>
                <h2 ref={completeHeading} tabIndex={-1} id="complete-title">
                  A fine night’s finding.
                </h2>
                <p>
                  Your official time: <strong>{time(round.elapsedMs)}</strong>
                </p>
                {round.submitted ? (
                  <p>✓ Your time has been published.</p>
                ) : (
                  <form onSubmit={submit}>
                    <label htmlFor="name">
                      Leave a name on the leaderboard (optional)
                    </label>
                    <div>
                      <input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={24}
                        autoComplete="nickname"
                      />
                      <button disabled={busy}>Submit time</button>
                    </div>
                  </form>
                )}
                <button className="outline" onClick={start} disabled={busy}>
                  Play another round
                </button>
              </section>
            )}
          </>
        )}
      </main>
      <footer>
        <span>LOOK CLOSELY. STAY CURIOUS.</span>
        <span>An original hidden-object game · Midnight Market</span>
      </footer>
      <TargetMenu
        targeting={targeting}
        targets={scene?.targets || []}
        found={found}
        busy={busy}
        guess={guess}
      />
      <dialog
        ref={dialog}
        onCancel={() => setShowBoard(false)}
        onClose={() => setShowBoard(false)}
      >
        <div className="dialog-top">
          <h2>The night’s quickest eyes</h2>
          <button
            onClick={() => setShowBoard(false)}
            aria-label="Close leaderboard"
          >
            ×
          </button>
        </div>
        {boardError ? (
          <p role="alert">
            {boardError} <button onClick={scores}>Retry</button>
          </p>
        ) : !board ? (
          <p>Loading times…</p>
        ) : board.length ? (
          <ol className="scores">
            {board.map((s, i) => (
              <li key={i}>
                <span>{s.name}</span>
                <strong>{time(s.elapsedMs)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No times yet. Make the first discovery.</p>
        )}
        <p>Fastest 20 completed searches · server-timed</p>
      </dialog>
    </>
  )
}
