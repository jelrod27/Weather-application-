import { getGraphicUpdatedAt } from '@/lib/tropical/graphics';

interface TropicalSourceTimeProps {
  src: string;
}

/** Stream optional source metadata without delaying the image or its recovery controls. */
export default async function TropicalSourceTime({ src }: TropicalSourceTimeProps): Promise<React.JSX.Element> {
  const updatedAt = await getGraphicUpdatedAt(src);
  return updatedAt
    ? <>Source file updated: <time dateTime={updatedAt}>{new Date(updatedAt).toUTCString()}</time></>
    : <>Source update time unavailable.</>;
}
