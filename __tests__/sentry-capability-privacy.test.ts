/** @jest-environment node */
import { NodeClient, requestDataIntegration, defaultStackParser } from '@sentry/node'
import { withIsolationScope, type StreamedSpanJSON } from '@sentry/core'
import { SENTRY_DATA_COLLECTION } from '@/lib/sentry-data-collection'

describe('capability privacy in actual Sentry preparation', () => {
  it.each(['referer', 'Referer', 'REFERER'])('filters %s in emitted events and processed segment spans', async header => {
    const envelopes: unknown[] = []
    const client = new NodeClient({
      dsn: 'https://public@example.invalid/1',
      stackParser: defaultStackParser,
      integrations: [requestDataIntegration()],
      dataCollection: SENTRY_DATA_COLLECTION,
      transport: () => ({
        send: async envelope => { envelopes.push(envelope); return { statusCode: 200 } },
        flush: async () => true,
      }),
    })
    client.init()
    const normalizedRequest = {
      url: 'https://example.invalid/api/alerts/guest-manage?%74oken=fixture-pin&view=compact',
      query_string: '%74oken=fixture-pin&view=compact',
      method: 'GET',
      headers: { [header]: 'https://example.invalid/alerts/manage?token=fixture-pin', 'content-type': 'application/json' },
    }
    try {
      client.captureEvent({ message: 'synthetic lookup failure', sdkProcessingMetadata: { normalizedRequest } })
      await client.flush(1000)
      expect(envelopes.length).toBeGreaterThan(0)
      expect(JSON.stringify(envelopes)).not.toContain('fixture-pin')
      expect(JSON.stringify(envelopes)).toContain('synthetic lookup failure')
      expect(JSON.stringify(envelopes)).toContain('application/json')

      const span: StreamedSpanJSON = {
        trace_id: 'a'.repeat(32), span_id: 'b'.repeat(16),
        name: 'GET /api/alerts/guest-manage', start_timestamp: 1,
        end_timestamp: 2, status: 'error', is_segment: true, attributes: {},
      }
      withIsolationScope(scope => {
        scope.setSDKProcessingMetadata({ normalizedRequest })
        client.emit('processSegmentSpan', span)
      })
      expect(JSON.stringify(span)).not.toContain('fixture-pin')
      expect(JSON.stringify(span)).toContain('application/json')
    } finally {
      await client.close(1000)
    }
  })
})
