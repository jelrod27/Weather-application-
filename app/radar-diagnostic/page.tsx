'use client'

export default function RadarDiagnostic() {
  const buildInfo = {
    version: 'radar-v2-rainviewer',
    timestamp: new Date().toISOString(),
    component: 'components/radar-v2/radar-shell.tsx',
    expectedLog: '[radar-v2] metadata load',
    expectedURL: 'api.rainviewer.com/public/weather-maps.json',
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Radar Build Diagnostic</h1>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Current Build Info</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(buildInfo, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">How to Verify Correct Build</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Open DevTools Console (F12)</li>
          <li>Go to main weather page and search for a US city</li>
          <li>Look for console log: <code className="bg-gray-700 px-2 py-1">[v2] WMS source created</code></li>
          <li>Check Network tab for requests to: <code className="bg-gray-700 px-2 py-1">wms/nexrad/n0q.cgi</code></li>
          <li>Should NOT see 404 errors to: <code className="bg-gray-700 px-2 py-1">tile.py/1.0.0/nexrad</code></li>
        </ol>
      </div>

      <div className="bg-yellow-900 border border-yellow-600 p-6 rounded-lg mt-6">
        <h2 className="text-xl font-bold mb-2">If Still Seeing Old Build</h2>
        <p>Clear your browser cache completely and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)</p>
        <p className="mt-2">Vercel deployment ID: Check URL for deployment hash</p>
      </div>
    </div>
  )
}
