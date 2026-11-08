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
    expected={r['name']:r for r in json.loads((HERE/'retrieval-log.json').read_text())}
    def get(row):
        target=cache/row['name']
        result={**row,'url':BASE+row['href']}
        try:
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
        except (OSError,ValueError,urllib.error.URLError) as error:
            return {**result,'status':'fetch_error','error':str(error)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(get,rows))
    # Preserve original evidence. A later reproduction must not overwrite it.
    (cache/'reproduction-retrieval-log.json').write_text(json.dumps(results,indent=2)+'\n')
    print({'files':len(results),'ok':sum(r['status']=='ok' for r in results),
           'failures':sum(r['status']!='ok' for r in results)})


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache',type=Path,default=Path('/tmp/weather-cloud-bufr'))
    retrieve(parser.parse_args().cache)
