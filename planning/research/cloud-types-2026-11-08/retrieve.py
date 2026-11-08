"""Re-fetch immutable names from the recorded DWD index; do not create a new sample.
The rolling feed expires: failures are expected after retention, never synthesize data.
Use audit.py score with committed decoded projections for offline reproduction.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

HERE=Path(__file__).resolve().parent
BASE='https://opendata.dwd.de/weather/weather_reports/synoptic/international/'


def retrieve(cache):
    cache.mkdir(parents=True,exist_ok=True)
    rows=[r for r in json.loads((HERE/'feed-index.json').read_text())['entries'] if 'latest' not in r['name']]
    log_path=HERE/'retrieval-log.json'
    try:
        recorded=json.loads(log_path.read_text())
        if not isinstance(recorded,list) or not recorded:
            raise ValueError('expected a nonempty array of recorded file hashes')
        for entry in recorded:
            if (not isinstance(entry,dict) or not isinstance(entry.get('name'),str)
                    or not isinstance(entry.get('sha256'),str) or len(entry['sha256'])!=64
                    or any(c not in '0123456789abcdef' for c in entry['sha256'])):
                raise ValueError('each recorded file needs a name and SHA-256 hash')
        expected={r['name']:r for r in recorded}
    except (OSError,ValueError) as error:
        raise ValueError(f'Cannot load required recorded retrieval log {log_path}: {error}') from error
    def get(row):
        target=cache/row['name']
        result={**row,'url':BASE+row['href']}
        try:
            if row['name'] not in expected:
                raise KeyError(f'no recorded hash for {row["name"]}')
            if not target.exists():
                request=urllib.request.Request(result['url'],headers={'User-Agent':'16BitWeather-source-feasibility/1.0'})
                with urllib.request.urlopen(request,timeout=40) as response:
                    target.write_bytes(response.read())
                time.sleep(.35)
            body=target.read_bytes()
            sha=hashlib.sha256(body).hexdigest()
            if sha!=expected[row['name']]['sha256']:
                raise ValueError('immutable file hash differs from recorded capture')
            return {**result,'sha256':sha,'fetched_bytes':len(body),'status':'ok',
                    'local_capture_completed_at_utc':datetime.fromtimestamp(target.stat().st_mtime,timezone.utc).isoformat()}
        except (OSError,ValueError,KeyError,urllib.error.URLError) as error:
            return {**result,'status':'fetch_error','error':str(error)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(get,rows))
    # Preserve original evidence. A later reproduction must not overwrite it.
    (cache/'reproduction-retrieval-log.json').write_text(json.dumps(results,indent=2)+'\n')
    print({'files':len(results),'ok':sum(r['status']=='ok' for r in results),
           'failures':sum(r['status']!='ok' for r in results)})
    return int(any(r['status']!='ok' for r in results))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache',type=Path,default=Path('/tmp/weather-cloud-bufr'))
    args=parser.parse_args()
    try:
        parser.exit(retrieve(args.cache))
    except ValueError as error:
        parser.exit(1,f'{parser.prog}: error: {error}\n')
