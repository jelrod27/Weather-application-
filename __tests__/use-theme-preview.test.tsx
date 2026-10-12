import { act, fireEvent, render, screen } from '@testing-library/react'
import { useThemePreview } from '@/hooks/use-theme-preview'
import { THEME_PREVIEW_DURATION } from '@/lib/theme-tiers'
import { toastService } from '@/lib/toast-service'

const mockAuth = { user: null as { id: string } | null }
const mockSetTheme = jest.fn()
const mockPreviewTheme = jest.fn()
const mockRestoreTheme = jest.fn()

jest.mock('@/lib/auth', () => ({ useAuth: () => mockAuth }))
jest.mock('@/components/theme-provider', () => ({
  useTheme: () => ({
    theme: 'daybreak',
    setTheme: mockSetTheme,
    previewTheme: mockPreviewTheme,
    restoreTheme: mockRestoreTheme,
  }),
}))
jest.mock('@/lib/toast-service', () => ({
  toastService: { success: jest.fn(), warning: jest.fn(), info: jest.fn() },
}))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

function PreviewProbe() {
  const { isPreviewActive, startPreview } = useThemePreview()
  return (
    <>
      <output>{isPreviewActive ? 'previewing' : 'idle'}</output>
      <button onClick={() => startPreview('dracula')}>Preview Dracula</button>
      <button onClick={() => startPreview('nord')}>Select Nord</button>
    </>
  )
}

describe('guest theme preview', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockAuth.user = null
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps a free theme selection after cancelling a premium preview', () => {
    render(<PreviewProbe />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview Dracula' }))
    expect(screen.getByRole('status')).toHaveTextContent('previewing')
    expect(mockPreviewTheme).toHaveBeenCalledWith('dracula')

    fireEvent.click(screen.getByRole('button', { name: 'Select Nord' }))
    expect(screen.getByRole('status')).toHaveTextContent('idle')
    expect(mockSetTheme).toHaveBeenCalledWith('nord')

    act(() => { jest.advanceTimersByTime(THEME_PREVIEW_DURATION + 1000) })
    expect(mockRestoreTheme).not.toHaveBeenCalled()
    expect(toastService.info).not.toHaveBeenCalled()
  })

  it('saves the active preview when the guest signs in', () => {
    const { rerender } = render(<PreviewProbe />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview Dracula' }))
    expect(screen.getByRole('status')).toHaveTextContent('previewing')

    mockAuth.user = { id: 'user' }
    rerender(<PreviewProbe />)

    expect(mockSetTheme).toHaveBeenCalledWith('dracula')
    expect(screen.getByRole('status')).toHaveTextContent('idle')
    act(() => { jest.advanceTimersByTime(THEME_PREVIEW_DURATION + 1000) })
    expect(mockRestoreTheme).not.toHaveBeenCalled()
  })
})
