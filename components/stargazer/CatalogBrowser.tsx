'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CatalogList from '@/components/stargazer/CatalogList';
import { formatType, matchesCatalogFilters } from '@/lib/stargazer/catalog';
import { readStargazerContext } from '@/lib/stargazer/context';
import type { CatalogEntry, CatalogEquipment } from '@/lib/stargazer/catalog';

interface CatalogBrowserProps { objects: CatalogEntry[] }

export default function CatalogBrowser({ objects }: CatalogBrowserProps): React.JSX.Element {
  const context = readStargazerContext(useSearchParams());
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [equipment, setEquipment] = useState<CatalogEquipment>('all');
  const filtered = objects.filter(object => matchesCatalogFilters(object, query, type, equipment));
  const types = [...new Set(objects.map(object => object.type))].sort();
  return <div className="space-y-4">
    <section aria-label="Catalog filters" className="container-primary p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Search names or IDs<input type="search" className="mt-1 w-full border border-border bg-background p-2" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label className="text-sm">Object type<select className="mt-1 w-full border border-border bg-background p-2" value={type} onChange={event => setType(event.target.value)}><option value="all">All types</option>{types.map(value => <option value={value} key={value}>{formatType(value)}</option>)}</select></label>
        <label className="text-sm">Equipment filter<select className="mt-1 w-full border border-border bg-background p-2" value={equipment} onChange={event => setEquipment(event.target.value as CatalogEquipment)}><option value="all">All equipment</option><option value="eyes">Just my eyes</option><option value="binoculars">Binoculars</option><option value="telescope">Telescope</option></select></label>
      </div>
      <p className="text-xs text-muted-foreground">Equipment filters use reviewed beginner guidance where available and catalog metadata elsewhere. Unknown equipment is excluded from equipment filters. These filters do not assess tonight’s visibility.</p>
      <div className="flex flex-wrap justify-between gap-3 text-sm"><p role="status">{filtered.length} of {objects.length} objects</p><button className="text-primary underline" type="button" onClick={() => { setQuery(''); setType('all'); setEquipment('all'); }}>Clear filters</button></div>
    </section>
    {filtered.length ? <CatalogList objects={filtered} context={context} /> : <p className="container-primary p-4">No objects match. Try a catalog ID such as M31, a common name, or clear the filters.</p>}
  </div>;
}
