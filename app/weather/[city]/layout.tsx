type Props = {
  params: Promise<{ city: string }>
  children: React.ReactNode
}

/** City SEO metadata lives in page.tsx only (avoids duplicate JSON-LD and API fetches). */
export default function CityWeatherLayout({ children }: Props) {
  return <>{children}</>
}
