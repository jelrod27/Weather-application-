import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import type { ReactElement } from 'react'

const mockAuth = { user: null as { id: string } | null, preferences: null as { theme: string } | null, loading: false, refreshPreferences: jest.fn() }
const mockSave = jest.fn()
jest.mock('@/lib/auth', () => ({ useAuth: () => mockAuth }))
jest.mock('@/lib/services/preferences-service', () => ({ updateUserPreferencesAPI: (...args: unknown[]) => mockSave(...args) }))
jest.mock('@/lib/user-cache-service', () => ({ userCacheService: { mirrorServerPreferences: jest.fn() } }))
function Probe(): ReactElement {
  const { theme, setTheme } = useTheme()
  return <><output>{theme}</output><button onClick={() => setTheme('clear-sky')}>Clear Sky</button></>
}
describe('theme preference resolution', () => {
  beforeEach(() => { localStorage.clear(); mockAuth.user = null; mockAuth.preferences = null; mockAuth.loading = false; jest.clearAllMocks() })
  it('defaults a fresh visitor to Clear Sky', () => { render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('clear-sky') })
  it.each(['daybreak', 'nord'])('preserves a saved %s choice', theme => { localStorage.setItem('weather-edu-theme', theme); render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent(theme) })
  it('does not let invalid local storage suppress a valid account theme', () => { localStorage.setItem('weather-edu-theme', 'unknown'); mockAuth.user = { id:'user' }; mockAuth.preferences = { theme:'daybreak' }; render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('daybreak') })
  it('keeps valid local preference precedence over account theme', () => { localStorage.setItem('weather-edu-theme', 'daybreak'); mockAuth.user = { id:'user' }; mockAuth.preferences = { theme:'nord' }; render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('daybreak') })
  it('drops a restricted theme on logout', () => { localStorage.setItem('weather-edu-theme', 'dracula'); mockAuth.user = {id:'user'}; const {rerender}=render(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('dracula'); mockAuth.user=null; rerender(<ThemeProvider><Probe /></ThemeProvider>); expect(screen.getByRole('status')).toHaveTextContent('clear-sky') })
  it('saves an explicit Clear Sky choice through the existing service', async () => { localStorage.setItem('weather-edu-theme','daybreak'); mockAuth.user={id:'user'}; mockSave.mockResolvedValue({ theme:'clear-sky' }); render(<ThemeProvider><Probe /></ThemeProvider>); fireEvent.click(screen.getByRole('button',{name:'Clear Sky'})); await waitFor(()=>expect(mockSave).toHaveBeenCalledWith({theme:'clear-sky'})); expect(localStorage.getItem('weather-edu-theme')).toBe('clear-sky') })
})
