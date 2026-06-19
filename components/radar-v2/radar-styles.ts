import type { FeatureLike } from 'ol/Feature'
import { Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import { Style } from 'ol/style'

export function alertStyle(feature: FeatureLike): Style {
  const severity = String(feature.get('severity') ?? 'Minor')
  const color = severity === 'Extreme'
    ? '#dc2626'
    : severity === 'Severe'
      ? '#ea580c'
      : severity === 'Moderate'
        ? '#ca8a04'
        : '#2563eb'

  return new Style({
    fill: new Fill({ color: `${color}33` }),
    stroke: new Stroke({ color, width: 2 }),
  })
}

export function spcStyle(feature: FeatureLike): Style {
  const fill = String(feature.get('fill') ?? '#facc15')
  const stroke = String(feature.get('stroke') ?? '#fef08a')
  return new Style({
    fill: new Fill({ color: `${fill}66` }),
    stroke: new Stroke({ color: stroke, width: 2 }),
  })
}

export function stormReportStyle(feature: FeatureLike): Style {
  const category = String(feature.get('category') ?? '')
  const color = category === 'tornado' ? '#ef4444' : category === 'hail' ? '#a855f7' : '#38bdf8'
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: `${color}dd` }),
      stroke: new Stroke({ color: '#020617', width: 1 }),
    }),
  })
}
