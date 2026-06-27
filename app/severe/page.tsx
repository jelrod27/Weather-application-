/**
 * 16-Bit Weather Platform - Severe Weather Page
 *
 * SPC convective outlook maps + filtered NWS alerts for severe
 * thunderstorm, tornado, wind, hail, and flood warnings. Server component
 * with a client leaf (SevereAlerts) for live alert polling.
 */
import PageWrapper from '@/components/page-wrapper';
import SPCOutlookTabs from '@/components/severe/SPCOutlookTabs';
import { ShareButtons } from '@/components/share-buttons';
import SevereAlerts from './severe-alerts';

export default function SeverePage() {
  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono uppercase">Severe Weather</h1>
          <p className="text-sm font-mono text-muted-foreground tracking-wider">// SPC STORM OUTLOOKS // ACTIVE WARNINGS</p>
          <ShareButtons
            config={{
              title: 'Severe Weather Outlook',
              text: 'Severe weather outlook -- SPC convective outlooks and NWS alerts at 16bitweather.co',
              url: 'https://www.16bitweather.co/severe',
            }}
            className="mt-3 justify-center"
          />
        </div>

        {/* SPC Convective Outlook Map — component is itself client-side */}
        <SPCOutlookTabs />

        {/* Alerts panel — polls every 5 min */}
        <SevereAlerts />
      </div>
    </PageWrapper>
  );
}
