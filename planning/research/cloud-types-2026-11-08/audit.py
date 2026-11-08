"""Offline research only. See ../cloud-types-source-audit-2026-11-08.md.
Decode cached real DWD BUFR with ecCodes; aggregate every predeclared slot.
No application imports, production dependencies, credentials, or network during scoring.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import gzip
import importlib.metadata
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAPPING_VERSION = 'wmo-020012-conservative-v1-2026-11-08'
GENERA = ['Cirrus','Cirrocumulus','Cirrostratus','Altocumulus','Altostratus',
          'Nimbostratus','Stratocumulus','Stratus','Cumulus','Cumulonimbus']
DIRECT = dict(enumerate(GENERA))
DIRECT.update({11:'Cirrus',12:'Cirrus',13:'Cirrus',14:'Cirrus',17:'Cirrostratus',
 18:'Cirrostratus',19:'Cirrocumulus',21:'Altostratus',23:'Altocumulus',
 24:'Altocumulus',25:'Altocumulus',26:'Altocumulus',27:'Altocumulus',
 28:'Altocumulus',29:'Altocumulus',31:'Cumulus',32:'Cumulus',
 33:'Cumulonimbus',34:'Stratocumulus',35:'Stratocumulus',36:'Stratus',39:'Cumulonimbus'})
# 15/16 guarantee Cs but not Ci. Keep the optional Ci separate.
OPTIONAL = {15:['Cirrus'],16:['Cirrus'],27:['Altostratus','Nimbostratus'],
 32:['Stratocumulus'],33:['Cumulus','Stratocumulus','Stratus'],
 39:['Cumulus','Stratocumulus','Stratus']}
AMBIGUOUS = {22:['Altostratus','Nimbostratus'],37:['Stratus','Cumulus']}
OBSCURED = {59,60,61,62}


def dump(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def iso(value):
    return datetime.fromisoformat(value.replace('Z','+00:00'))


def classify(codes, total):
    """Conservative genus mapping, preserving optional/alternative membership."""
    accepted, alternatives, optional = set(), [], []
    for code in codes:
        if code in DIRECT:
            accepted.add(DIRECT[code])
        elif code in (15,16):
            accepted.add('Cirrostratus')
        elif code == 38:
            accepted.update(['Cumulus','Stratocumulus'])
        if code in AMBIGUOUS:
            alternatives.append({'raw_code':code,'one_or_both' : code == 37,
                                 'genera':AMBIGUOUS[code]})
        if code in OPTIONAL:
            optional.append({'raw_code':code,'not_confirmed':OPTIONAL[code]})
    obscured = sorted(set(c for c in codes if c in OBSCURED))
    known = set(DIRECT) | {10,15,16,20,22,30,37,38,59,60,61,62,63} | set(range(40,50))
    unknown = sorted(set(c for c in codes if c not in known))
    clear_evidence = 43 in codes or {10,20,30}.issubset(codes)
    cloud_evidence = bool(accepted or alternatives) or any(c in {40,41,42,44,45,46,47,48,49} for c in codes)
    contradiction = ((total == 0 or clear_evidence) and cloud_evidence) or (
        clear_evidence and total is not None and total > 0)
    if contradiction:
        status = 'unclassified'
        accepted.clear()  # Preserve raw codes, but abstain from accepting a name.
    elif unknown:
        status = 'unclassified'
    elif alternatives:
        status = 'ambiguous_type'
    elif accepted:
        status = 'explicit_genus'
    elif obscured:
        status = 'obscured'
    elif total == 0 or clear_evidence:
        status = 'cloud_free_within_source_limits'
    elif any(c in range(40,50) for c in codes):
        status = 'unclassified'
    else:
        status = 'missing'
    return dict(status=status, accepted_genera=sorted(accepted),
                alternatives=alternatives, optional_genera=optional,
                obscured_codes=obscured, mapping_version=MAPPING_VERSION)


def clean(value):
    if hasattr(value, 'item'):
        value = value.item()
    if value == 2147483647 or isinstance(value, float) and (not math.isfinite(value) or abs(value)>1e90):
        return None
    return value


def extract_subset(ec, handle, subset):
    """Reparse extracted bytes: unpacked arrays on a cloned handle retain all subsets."""
    clone = ec.codes_clone(handle)
    try:
        ec.codes_set(clone,'unpack',1)
        ec.codes_set(clone,'extractSubset',subset)
        ec.codes_set(clone,'doExtractSubsets',1)
        extracted = ec.codes_new_from_message(ec.codes_get_message(clone))
        ec.codes_set(extracted,'unpack',1)
        return extracted
    finally:
        ec.codes_release(clone)


def decode(cache, out):
    import eccodes as ec
    log = json.loads((HERE/'retrieval-log.json').read_text())
    manifest = json.loads((HERE/'sampling-manifest.json').read_text())
    locations = manifest['locations']
    records, failures, counts = [], [], Counter()
    # Keep all reports geographically near any declared point, including reports
    # without types. This avoids filtering for a successful type before scoring.
    for source in log:
        if source['status'] != 'ok':
            failures.append({'file':source['name'],'stage':'fetch','error':source.get('error')})
            continue
        path = cache/source['name']
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
            failures.append({'file':source['name'],'stage':'hash','error':'missing or checksum differs'})
            continue
        with path.open('rb') as stream:
            message_index = 0
            while True:
                try:
                    handle = ec.codes_bufr_new_from_file(stream)
                except Exception as error:
                    failures.append({'file':source['name'],'stage':'message','error':str(error)})
                    break
                if handle is None:
                    break
                message_index += 1
                counts['messages'] += 1
                try:
                    ec.codes_set(handle,'unpack',1)
                    n = int(ec.codes_get(handle,'numberOfSubsets'))
                    counts['subsets'] += n
                    version = int(ec.codes_get(handle,'masterTablesVersionNumber'))
                    counts['table_'+str(version)] += n
                    latitudes = ec.codes_get_array(handle,'latitude')
                    longitudes = ec.codes_get_array(handle,'longitude')
                    for subset in range(1,n+1):
                        lat0 = clean(latitudes[0 if len(latitudes)==1 else subset-1])
                        lon0 = clean(longitudes[0 if len(longitudes)==1 else subset-1])
                        if lat0 is None or lon0 is None:
                            counts['no_geometry'] += 1
                            continue
                        if not any(distance(lat0,lon0,x['latitude'],x['longitude']) <= 120 for x in locations):
                            continue
                        single = handle
                        if n > 1:
                            single = extract_subset(ec,handle,subset)
                        try:
                            def value(key):
                                try:
                                    return clean(ec.codes_get(single,key))
                                except ec.CodesInternalError:
                                    return None
                            lat, lon = value('latitude'), value('longitude')
                            if lat is None or lon is None:
                                counts['no_geometry'] += 1
                                continue
                            if not any(distance(lat,lon,x['latitude'],x['longitude']) <= 120 for x in locations):
                                continue
                            fields = {}
                            iterator = ec.codes_bufr_keys_iterator_new(single)
                            try:
                                while ec.codes_bufr_keys_iterator_next(iterator):
                                    key = ec.codes_bufr_keys_iterator_get_name(iterator)
                                    base = key.split('#')[-1]
                                    if base in ('cloudType','cloudAmount','cloudCoverTotal','verticalSignificanceSurfaceObservations') or any(s in base.lower() for s in ('quality','confidence','methodof','instrumentation')):
                                        try:
                                            a = ec.codes_get_array(single,key)
                                            fields[key] = [clean(v) for v in a]
                                        except ec.CodesInternalError:
                                            fields[key] = None
                            finally:
                                ec.codes_bufr_keys_iterator_delete(iterator)
                            parts = [value(k) for k in ('year','month','day','hour','minute')]
                            if any(x is None for x in parts):
                                counts['no_observation_time'] += 1
                                continue
                            observed = datetime(*map(int,parts),tzinfo=timezone.utc).isoformat()
                            codes = [v for k,vs in fields.items() if k.split('#')[-1]=='cloudType' for v in (vs or []) if v is not None]
                            total = value('cloudCoverTotal')
                            record = dict(station_id=f"{value('blockNumber')}-{value('stationNumber')}",
                              station_name=value('stationOrSiteName'),latitude=lat,longitude=lon,
                              elevation_m=value('heightOfStationGroundAboveMeanSeaLevel'),
                              station_type=value('stationType'),observed_at_utc=observed,
                              source_receipt_at_utc=None,
                              feed_modified_at_utc=source['listing_modified_utc'],
                              # File modification is only a publication-time proxy.
                              fetched_at_utc=datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),
                              file=source['name'],message_index=message_index,subset=subset,
                              source_sha256=source['sha256'],master_table_version=version,
                              local_table_version=value('localTablesVersionNumber'),
                              centre=value('bufrHeaderCentre'),subcentre=value('bufrHeaderSubCentre'),
                              edition=value('edition'),update_sequence=value('updateSequenceNumber'),
                              raw_codes=codes,total_cloud_cover=total,raw_fields=fields,
                              observed_method='stationType retained; cloud-specific method unavailable unless raw_fields provides it',
                              **classify(codes,total))
                            records.append(record)
                        except Exception as error:
                            failures.append({'file':source['name'],'message':message_index,'subset':subset,'stage':'subset','error':str(error)})
                        finally:
                            if single != handle:
                                ec.codes_release(single)
                except Exception as error:
                    failures.append({'file':source['name'],'message':message_index,'stage':'unpack','error':str(error)})
                finally:
                    ec.codes_release(handle)
    out.mkdir(exist_ok=True)
    with gzip.open(out/'reports.jsonl.gz','wt') as stream:
        for record in records:
            stream.write(json.dumps(record,allow_nan=False,separators=(',',':'))+'\n')
    dump(out/'decode-summary.json',dict(counts=counts,retained_reports=len(records),failures=failures,
      eccodes_python_distribution_version=importlib.metadata.version('eccodes'),eccodes_engine_version=ec.codes_get_api_version()))
    print(dict(counts=counts,retained_reports=len(records),failure_count=len(failures)))


def distance(lat1,lon1,lat2,lon2):
    r1,r2 = math.radians(lat1),math.radians(lat2)
    a=math.sin((r2-r1)/2)**2+math.cos(r1)*math.cos(r2)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371*2*math.atan2(math.sqrt(a),math.sqrt(max(0,1-a)))


def solar_period(instant, latitude, longitude):
    """NOAA fractional-year approximation; solar-centre geometry, no refraction.
    For sampling day/night context only, not a production sunrise calculation.
    """
    hour=instant.hour+instant.minute/60
    gamma=2*math.pi/365*(instant.timetuple().tm_yday-1+(hour-12)/24)
    eq=229.18*(.000075+.001868*math.cos(gamma)-.032077*math.sin(gamma)
               -.014615*math.cos(2*gamma)-.040849*math.sin(2*gamma))
    dec=(.006918-.399912*math.cos(gamma)+.070257*math.sin(gamma)
         -.006758*math.cos(2*gamma)+.000907*math.sin(2*gamma)
         -.002697*math.cos(3*gamma)+.00148*math.sin(3*gamma))
    ha=math.radians((hour*60+eq+4*longitude)%1440/4-180)
    lat=math.radians(latitude)
    elevation=math.degrees(math.asin(math.sin(lat)*math.sin(dec)+math.cos(lat)*math.cos(dec)*math.cos(ha)))
    return 'day' if elevation>=0 else 'twilight' if elevation>=-6 else 'night'


def quantiles(values):
    if not values:
        return None
    s=sorted(values)
    def q(p):
        return s[round((len(s)-1)*p)]
    return {'n':len(s),'min':s[0],'median':q(.5),'p90':q(.9),'p95':q(.95),'max':s[-1]}


def score():
    manifest=json.loads((HERE/'sampling-manifest.json').read_text())
    with gzip.open(HERE/'reports.jsonl.gz','rt') as stream:
        reports=[json.loads(x) for x in stream]
    start=iso(manifest['requested_window']['start'])
    slots=[start+timedelta(hours=n) for n in range(168)]
    # Only full query hours after retained files begin are in the shortened window.
    first_published=min(iso(x['listing_modified_utc']) for x in json.loads((HERE/'retrieval-log.json').read_text()))
    short_start=first_published.replace(minute=0,second=0)+timedelta(hours=1)
    output=[]
    for source in ('dwd','meteomatics','meteoblue'):
        for policy_name,policy in manifest['policies'].items():
            if source != 'dwd' and policy_name != 'baseline':
                continue
            for location in manifest['locations']:
                geometric=[]
                if source=='dwd':
                    for r in reports:
                        d=distance(location['latitude'],location['longitude'],r['latitude'],r['longitude'])
                        elev=r['elevation_m']
                        delta=None if elev is None else abs(elev-location['reference_elevation_m'])
                        if d <= policy['max_distance_km'] and delta is not None and delta <= policy['max_elevation_difference_m']:
                            geometric.append((d,delta,r))
                for slot in slots:
                    result=dict(source=source,policy=policy_name,location=location['id'],slot_utc=slot.isoformat(),
                                in_shortened_window=slot>=short_start,solar_period=solar_period(slot,location['latitude'],location['longitude']),status='missing',reason='outside_retained_window',
                                evidence=None)
                    if source != 'dwd':
                        result.update(status='unsupported',reason='no_authorized_payload_or_entitlement_validated')
                    elif slot>=short_start:
                        eligible=[(d,delta,r) for d,delta,r in geometric if iso(r['observed_at_utc'])<=slot and iso(r['feed_modified_at_utc'])<=slot]
                        if not geometric:
                            result.update(status='unsupported',reason='no_station_within_geographic_policy_in_sample')
                        elif not eligible:
                            result.update(reason='no_published_report_at_query_slot')
                        else:
                            # Choose station by geometry before looking at genus success;
                            # latest observation from nearest station, latest update as tie-break.
                            d,delta,r=min(eligible,key=lambda x:(x[0],-iso(x[2]['observed_at_utc']).timestamp(),-iso(x[2]['feed_modified_at_utc']).timestamp()))
                            age=(slot-iso(r['observed_at_utc'])).total_seconds()/60
                            result.update(status=r['status'] if age<=policy['max_age_minutes'] else 'stale',
                              reason='nearest_published_station_report',age_minutes=age,distance_km=round(d,3),
                              elevation_difference_m=delta,evidence=r)
                    output.append(result)
    with gzip.open(HERE/'slots.jsonl.gz','wt') as stream:
        for r in output:
            # Full evidence retained separately; link by immutable file/message/subset.
            e=r.pop('evidence')
            if e:
                r['evidence_ref']={k:e[k] for k in ('file','message_index','subset','station_id','observed_at_utc')}
                r['accepted_genera']=e['accepted_genera']
                r['raw_codes']=e['raw_codes']
                r['alternatives']=e['alternatives']
            stream.write(json.dumps(r,separators=(',',':'))+'\n')
    summary={'requested_denominator_per_source_policy':len(manifest['locations'])*168,'shortened_window_start':short_start.isoformat(),
             'shortened_window_end':slots[-1].isoformat(),'denominators_include_failures':True,'groups':[]}
    for source,policy in sorted(set((r['source'],r['policy']) for r in output)):
        for window in ('requested','shortened'):
            group=[r for r in output if r['source']==source and r['policy']==policy and (window=='requested' or r['in_shortened_window'])]
            counts=Counter({key:0 for key in ('explicit_genus','ambiguous_type','cloud_free_within_source_limits','obscured','stale','missing','unsupported','unclassified')})
            counts.update(r['status'] for r in group)
            summary['groups'].append(dict(source=source,policy=policy,window=window,n=len(group),counts=counts,
              percent={k:round(100*v/len(group),2) for k,v in sorted(counts.items())},
              age_minutes=quantiles([r['age_minutes'] for r in group if 'age_minutes' in r]),
              solar_period_counts={period:dict(Counter(r['status'] for r in group if r['solar_period']==period)) for period in ('day','twilight','night')},
              distance_km=quantiles([r['distance_km'] for r in group if 'distance_km' in r]),
              per_location={loc['id']:dict(Counter(r['status'] for r in group if r['location']==loc['id'])) for loc in manifest['locations']}))
    delays=[(iso(r['feed_modified_at_utc'])-iso(r['observed_at_utc'])).total_seconds()/60 for r in reports]
    summary['publication_delay_proxy_minutes']=quantiles(delays)
    stations=defaultdict(set)
    for r in reports:
        stations[r['station_id']].add(r['observed_at_utc'])
    summary['observed_intervals_minutes']=quantiles([(iso(b)-iso(a)).total_seconds()/60 for times in stations.values() for a,b in zip(sorted(times),sorted(times)[1:])])
    dump(HERE/'summary.json',summary)
    print(json.dumps(summary,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['decode','score'])
    parser.add_argument('--cache',type=Path,default=Path('/tmp/weather-cloud-bufr'))
    args=parser.parse_args()
    decode(args.cache,HERE) if args.command=='decode' else score()
