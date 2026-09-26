import { cloudDatabase } from '@/data/cloud-types'

export interface CloudTypesFaqEntry {
  question: string
  answer: string
}

/**
 * The cloud atlas FAQ. Rendered on /cloud-types and mirrored as FAQPage
 * JSON-LD from the same array, so the markup never describes text that is
 * not on the page.
 */
export const CLOUD_TYPES_FAQ: CloudTypesFaqEntry[] = [
  {
    question: 'How many cloud types does the atlas cover?',
    answer:
      `The atlas has ${cloudDatabase.length} entries, including the ten WMO genera: cirrus, cirrocumulus, cirrostratus, altocumulus, altostratus, nimbostratus, stratocumulus, stratus, cumulus and cumulonimbus. Other entries describe species, varieties, supplementary features and special phenomena. Lenticularis is a species; mamma (often called mammatus) and asperitas are supplementary features, not additional genera.`,
  },
  {
    question: 'How do you identify cirrus clouds?',
    answer:
      'Cirrus clouds are high clouds made of ice crystals, often appearing as thin filaments or wispy streaks. Their appearance alone does not provide a reliable countdown to a weather change.',
  },
  {
    question: 'What cloud type produces thunderstorms?',
    answer:
      'Cumulonimbus is the thunderstorm cloud genus. These deep clouds can produce lightning, heavy rain, hail and damaging winds; some thunderstorms produce tornadoes. A cloud identification is not a substitute for an official warning.',
  },
  {
    question: 'What are mammatus clouds?',
    answer:
      'Mammatus is the familiar name for mamma, pouch-like projections beneath a cloud. WMO lists this supplementary feature mainly with cirrus, cirrocumulus, altocumulus, altostratus, stratocumulus and cumulonimbus. It does not by itself indicate a tornado or that a storm has ended.',
  },
  {
    question: 'What causes lenticular clouds?',
    answer:
      'Lenticularis describes lens-shaped clouds, mainly in altocumulus, cirrocumulus and stratocumulus. They often form in mountain waves and can remain nearly stationary while air flows through them. They can also form without pronounced terrain.',
  },
  {
    question: 'Is asperitas a separate cloud genus?',
    answer:
      'No. Asperitas is a supplementary feature, mostly associated with stratocumulus and altocumulus. It describes an irregular, wave-like cloud underside rather than a new genus.',
  },
]

export function buildCloudTypesFaqJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CLOUD_TYPES_FAQ.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }
}
