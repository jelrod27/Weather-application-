import { render, screen } from '@testing-library/react'
import WinterNationalOutlook from '@/components/winter/winter-national-outlook'
import type { WinterMapSnapshot } from '@/lib/winter/types'

jest.mock('next/dynamic', () => () => function MapPlaceholder() { return <div>Map display</div> })

const now = Date.parse('2026-11-14T12:00:00Z')
const snapshot: WinterMapSnapshot = { selection: { product: 'snow', day: 1, threshold: 4 }, source: 'WPC', sourceUrl: 'https://www.wpc.ncep.noaa.gov/', coverage: 'Contiguous United States', status: 'empty', issuedAt: '2026-11-14T10:00:00Z', validFrom: '2026-11-14T12:00:00Z', validTo: '2026-11-15T12:00:00Z', fetchedAt: '2026-11-14T12:00:00Z', message: null, legend: [], contours: { type: 'FeatureCollection', features: [] } }

function show(value: WinterMapSnapshot): void {
  render(<WinterNationalOutlook selection={value.selection} onSelect={jest.fn()} snapshot={value} loading={false} error={null} place={null} now={now} />)
}

describe('Winter outlook validity', () => {
  it('allows verified empty periods without describing zero risk', () => {
    show(snapshot)
    expect(screen.getByText(/No mapped contours meet this threshold/)).toBeInTheDocument()
  })
  it('hides expired periods with an explicit source-state message', () => {
    show({ ...snapshot, validFrom: '2026-11-13T12:00:00Z', validTo: '2026-11-14T11:00:00Z' })
    expect(screen.getByText(/Outlook expired/)).toBeInTheDocument()
    expect(screen.queryByText(/No mapped contours meet this threshold/)).not.toBeInTheDocument()
  })
  it('does not describe a stale source as a valid empty forecast', () => {
    show({ ...snapshot, status: 'stale' })
    expect(screen.queryByText(/No mapped contours meet this threshold/)).not.toBeInTheDocument()
    expect(screen.getByText(/Stale source cycle/)).toBeInTheDocument()
    expect(screen.queryByText(/regional forecast contours/)).not.toBeInTheDocument()
  })
})
