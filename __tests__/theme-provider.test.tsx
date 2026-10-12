import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import type { ReactElement } from 'react'

const mockAuth = { user: null as { id: string } | null, preferences: null as { theme: string } | null, loading: false, refreshPreferences: jest.fn() }
const mockSave = jest.fn()
jest.mock('@/lib/auth', () => ({ useAuth: () => mockAuth }))
jest.mock('@/lib/services/preferences-service', () => ({ updateUserPreferencesAPI: (...args: unknown[]) => mockSave(...args) }))
jest.mock('@/lib/user-cache-service', () => ({ userCacheService: { mirrorServerPreferences: jest.fn() } }))
function Probe(): ReactElement {
  const { theme, setTheme, previewTheme, restoreTheme } = useTheme()
  return <><output>{theme}</output><button onClick={() => setTheme('clear-sky')}>Clear Sky</button><button onClick={() => setTheme('nord')}>Select Nord</button><button onClick={() => previewTheme('dracula')}>Preview Dracula</button><button onClick={() => restoreTheme('nord')}>Restore Nord</button></>
}
describe('theme preference resolution', () => {
  beforeEach(() => { localStorage.clear(); document.cookie = 'weather-theme=; path=/; max-age=0'; mockAuth.user = null; mockAuth.preferences = null; mockAuth.loading = false; jest.clearAllMocks() })
  it('defaults a fresh visitor to Clear Sky', () => { render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('clear-sky') })
  it.each(['daybreak', 'nord'])('preserves a saved %s choice', theme => { localStorage.setItem('weather-edu-theme', theme); render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent(theme); expect(document.cookie).toContain(`weather-theme=${theme}`) })
  it('does not let invalid local storage suppress a valid account theme', () => { localStorage.setItem('weather-edu-theme', 'unknown'); mockAuth.user = { id:'user' }; mockAuth.preferences = { theme:'daybreak' }; render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('daybreak') })
  it('keeps valid local preference precedence over account theme', () => { localStorage.setItem('weather-edu-theme', 'daybreak'); mockAuth.user = { id:'user' }; mockAuth.preferences = { theme:'nord' }; render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('daybreak') })
  it('drops a restricted theme and updates the first-paint cookie on logout', () => { localStorage.setItem('weather-edu-theme', 'dracula'); document.cookie = 'weather-theme=dracula; path=/'; mockAuth.user = {id:'user'}; const {rerender}=render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('dracula'); mockAuth.user=null; rerender(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('clear-sky'); expect(document.cookie).toContain('weather-theme=clear-sky') })
  it('saves an explicit Clear Sky choice through the existing service', async () => { localStorage.setItem('weather-edu-theme','daybreak'); mockAuth.user={id:'user'}; mockSave.mockResolvedValue({ theme:'clear-sky' }); render(<ThemeProvider><Probe /></ThemeProvider>); fireEvent.click(screen.getByRole('button',{name:'Clear Sky'})); await waitFor(()=>expect(mockSave).toHaveBeenCalledWith({theme:'clear-sky'})); expect(localStorage.getItem('weather-edu-theme')).toBe('clear-sky') })
  it('previews a premium theme visually for a guest', () => { render(<ThemeProvider><Probe /></ThemeProvider>); fireEvent.click(screen.getByRole('button',{name:'Preview Dracula'})); expect(screen.getByRole('status')).toHaveTextContent('dracula'); expect(localStorage.getItem('weather-edu-theme')).toBeNull() })
  it('restores the theme in use before a preview', () => { render(<ThemeProvider><Probe /></ThemeProvider>); fireEvent.click(screen.getByRole('button',{name:'Preview Dracula'})); fireEvent.click(screen.getByRole('button',{name:'Restore Nord'})); expect(screen.getByRole('status')).toHaveTextContent('nord') })
  it('restores the previous theme when saving fails', async () => { localStorage.setItem('weather-edu-theme','daybreak'); mockAuth.user={id:'user'}; mockSave.mockRejectedValue(new Error('offline')); render(<ThemeProvider><Probe /></ThemeProvider>); fireEvent.click(screen.getByRole('button',{name:'Clear Sky'})); await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('daybreak')); expect(localStorage.getItem('weather-edu-theme')).toBe('daybreak') })

  it('keeps the newest selection when an older queued save fails', async () => {
    localStorage.setItem('weather-edu-theme', 'daybreak')
    mockAuth.user = { id: 'user' }
    let rejectFirst!: (reason?: unknown) => void
    mockSave.mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject }))
    mockSave.mockResolvedValueOnce({ theme: 'nord' })
    render(<ThemeProvider><Probe /></ThemeProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Clear Sky' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Nord' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    await act(async () => { rejectFirst(new Error('offline')) })
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('status')).toHaveTextContent('nord')
    expect(localStorage.getItem('weather-edu-theme')).toBe('nord')
    expect(document.cookie).toContain('weather-theme=nord')
  })

  it('restores the last successful choice when the newest save fails', async () => {
    localStorage.setItem('weather-edu-theme', 'daybreak')
    mockAuth.user = { id: 'user' }
    mockSave.mockResolvedValueOnce({ theme: 'clear-sky' })
    mockSave.mockRejectedValueOnce(new Error('offline'))
    render(<ThemeProvider><Probe /></ThemeProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Clear Sky' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Nord' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('clear-sky'))
    expect(localStorage.getItem('weather-edu-theme')).toBe('clear-sky')
    expect(document.cookie).toContain('weather-theme=clear-sky')
  })

  it('does not let an old save failure change the guest theme after logout', async () => {
    localStorage.setItem('weather-edu-theme', 'dracula')
    mockAuth.user = { id: 'user' }
    let rejectSave!: (reason?: unknown) => void
    mockSave.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
    const { rerender } = render(<ThemeProvider><Probe /></ThemeProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Select Nord' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    mockAuth.user = null
    rerender(<ThemeProvider><Probe /></ThemeProvider>)
    await act(async () => { rejectSave(new Error('offline')) })

    expect(screen.getByRole('status')).toHaveTextContent('nord')
    expect(localStorage.getItem('weather-edu-theme')).toBe('nord')
    expect(document.cookie).toContain('weather-theme=nord')
  })
})
