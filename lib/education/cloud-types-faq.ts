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
      `The atlas documents ${cloudDatabase.length} cloud types. They include the ten main genera grouped by altitude — high clouds (cirrus, cirrostratus, cirrocumulus), mid-level clouds (altocumulus, altostratus, nimbostratus), low clouds (cumulus, stratocumulus, stratus) and cumulonimbus, which spans every level — plus the species, supplementary features and special clouds such as mammatus, lenticular and noctilucent formations.`,
  },
  {
    question: 'How do you identify cirrus clouds?',
    answer:
      'Cirrus clouds are thin, wispy, hair-like streaks found at high altitudes (20,000-40,000 ft). They are made of ice crystals and often indicate fair weather with a possible change in 8-10 hours.',
  },
  {
    question: 'What cloud type produces thunderstorms?',
    answer:
      'Cumulonimbus clouds produce thunderstorms, lightning, heavy rain, hail and tornadoes. They extend from near the ground to 60,000+ feet and are the only cloud type that can produce every form of severe weather.',
  },
  {
    question: 'What are mammatus clouds?',
    answer:
      'Mammatus clouds are rare pouch-like formations that hang from the underside of storm clouds. They form when cold air sinks in downdrafts and often appear after severe thunderstorms have passed.',
  },
  {
    question: 'What causes lenticular clouds?',
    answer:
      'Lenticular clouds form when air flows over mountains and creates standing waves. They appear lens or saucer-shaped and stay stationary despite high winds, which is why they are often mistaken for UFOs.',
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
