import Link from 'next/link';
import { formatBestMonths, formatType, groupByType } from '@/lib/stargazer/catalog';
import { getStargazerHref } from '@/lib/stargazer/context';
import type { CatalogEntry } from '@/lib/stargazer/catalog';
import type { StargazerContext } from '@/lib/stargazer/context';

interface CatalogListProps { objects: CatalogEntry[]; context?: StargazerContext }

export default function CatalogList({ objects, context }: CatalogListProps): React.JSX.Element {
  return <div className="space-y-4">{groupByType(objects).map(group => <section key={group.type} className="rounded-md border border-border bg-card p-4">
    <h2 className="mb-3 border-b border-border pb-2 text-xs uppercase tracking-wider text-muted-foreground">{formatType(group.type)} <span className="text-foreground">({group.objects.length})</span></h2>
    <ul className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{group.objects.map(obj => <li key={obj.id} className="flex flex-wrap items-baseline gap-x-2">
      <Link className="text-primary hover:underline" href={context ? getStargazerHref(context, { objectId: obj.id }) : `/stargazer/objects/${obj.id}`}>{obj.id} {obj.name}</Link>
      <span className="text-xs text-muted-foreground">{obj.constellation} · mag {obj.magnitude} · {formatBestMonths(obj.bestMonths)}</span>
    </li>)}</ul>
  </section>)}</div>;
}
