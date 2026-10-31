import { afterEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { position } from './api.js'
afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
})
const scene = {
  id: 'market',
  name: 'Midnight Market',
  asset: '/market.svg',
  targets: [{ id: 'cat', name: 'Clementine', symbol: 'cat' }],
}
const response = (data, ok = true) =>
  Promise.resolve({ ok, json: async () => data })
test('coordinate calculation accounts for rendered offsets and dimensions', () => {
  expect(
    position(250, 300, { left: 100, top: 200, width: 300, height: 200 }),
  ).toEqual({ x: 0.5, y: 0.5 })
  expect(
    position(-20, 900, { left: 0, top: 0, width: 300, height: 200 }),
  ).toEqual({ x: 0, y: 1 })
})
test('selection, failure recovery, progress, completion and replay', async () => {
  let guesses = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (url.endsWith('/scene')) return response(scene)
    if (url.endsWith('/rounds'))
      return response({
        credential: 'a'.repeat(64),
        startedAt: new Date().toISOString(),
      })
    if (url.endsWith('/round'))
      return response({ startedAt: new Date().toISOString(), markers: [] })
    if (url.endsWith('/guesses')) {
      guesses++
      if (guesses === 1) return response({ error: 'Try again' }, false)
      return response({
        correct: true,
        markers: [{ targetId: 'cat', x: 0.5, y: 0.5 }],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: 1234,
      })
    }
    if (url.endsWith('/scores')) {
      expect(JSON.parse(options.body)).toEqual({ name: 'Owl' })
      return response({ ok: true })
    }
  })
  const user = userEvent.setup()
  render(<App />)
  const img = await screen.findByRole('img')
  fireEvent.load(img)
  await user.click(screen.getByRole('button', { name: 'Start searching →' }))
  const surface = screen.getByRole('group')
  fireEvent.keyDown(surface, { key: 'Enter' })
  await user.click(screen.getByRole('button', { name: 'Clementine' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again')
  expect(
    screen.queryByRole('dialog', { name: 'Who did you find?' }),
  ).not.toBeInTheDocument()
  fireEvent.keyDown(surface, { key: 'Enter' })
  await user.click(screen.getByRole('button', { name: 'Clementine' }))
  expect(await screen.findByText('A fine night’s finding.')).toBeInTheDocument()
  expect(screen.getByText('✓ FOUND')).toBeInTheDocument()
  await user.type(screen.getByLabelText(/Leave a name/), 'Owl')
  await user.click(screen.getByRole('button', { name: 'Submit time' }))
  expect(
    await screen.findByText('✓ Your time has been published.'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Play another round' }))
  await waitFor(() =>
    expect(
      screen.queryByText('A fine night’s finding.'),
    ).not.toBeInTheDocument(),
  )
})
test('initial request error offers retry', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Offline' }),
    })
    .mockImplementation(() => response(scene))
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  await userEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
  expect(await screen.findByRole('img')).toBeInTheDocument()
})

test('incorrect guesses preserve progress; menus close with Escape and clicking away', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.endsWith('/scene')) return response(scene)
    if (url.endsWith('/rounds'))
      return response({
        credential: 'b'.repeat(64),
        startedAt: new Date().toISOString(),
      })
    if (url.endsWith('/round'))
      return response({ startedAt: new Date().toISOString(), markers: [] })
    return response({
      correct: false,
      startedAt: new Date().toISOString(),
      markers: [],
    })
  })
  const user = userEvent.setup()
  render(<App />)
  fireEvent.load(await screen.findByRole('img'))
  await user.click(screen.getByRole('button', { name: 'Start searching →' }))
  const surface = screen.getByRole('group')
  fireEvent.keyDown(surface, { key: 'Enter' })
  await user.keyboard('{Escape}')
  expect(
    screen.queryByRole('dialog', { name: 'Who did you find?' }),
  ).not.toBeInTheDocument()
  expect(surface).toHaveFocus()
  fireEvent.keyDown(surface, { key: 'Enter' })
  fireEvent.click(document.querySelector('.menu-backdrop'))
  expect(
    screen.queryByRole('dialog', { name: 'Who did you find?' }),
  ).not.toBeInTheDocument()
  fireEvent.keyDown(surface, { key: 'Enter' })
  await user.click(screen.getByRole('button', { name: 'Clementine' }))
  expect(
    await screen.findByText('Not quite. Take another look!'),
  ).toBeInTheDocument()
  expect(screen.getByText('WANTED')).toBeInTheDocument()
})
test('leaderboard supports errors, retry, and empty state', async () => {
  let calls = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.endsWith('/scene')) return response(scene)
    calls++
    return calls === 1
      ? response({ error: 'Board unavailable' }, false)
      : response([])
  })
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('img')
  await user.click(screen.getByRole('button', { name: 'The leaderboard ↗' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Board unavailable',
  )
  await user.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  expect(
    await screen.findByText('No times yet. Make the first discovery.'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close leaderboard' }))
})
