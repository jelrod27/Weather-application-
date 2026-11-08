"""Exploratory one-variable sensitivity; original predeclared score is untouched.
Uses only the bounds declared in sampling-manifest.json, with no new downloads.
These separate combinations were evaluated after the initial joint-policy results.
"""
from contextlib import redirect_stdout
import copy
import io
import json
from pathlib import Path
import shutil
import tempfile
from unittest.mock import patch
import audit


def main():
    original=audit.HERE
    manifest=json.loads((original/'sampling-manifest.json').read_text())
    results=[]
    for field in ('max_age_minutes','max_distance_km','max_elevation_difference_m'):
        for bound in ('strict','relaxed'):
            updated=copy.deepcopy(manifest)
            policy=copy.deepcopy(manifest['policies']['baseline'])
            policy[field]=manifest['policies'][bound][field]
            updated['policies']={'baseline':policy}
            with tempfile.TemporaryDirectory() as temp:
                directory=Path(temp)
                (directory/'sampling-manifest.json').write_text(json.dumps(updated))
                for name in ('retrieval-log.json','reports.jsonl.gz'):
                    shutil.copyfile(original/name,directory/name)
                with patch.object(audit,'HERE',directory),redirect_stdout(io.StringIO()):
                    audit.score()
                summary=json.loads((directory/'summary.json').read_text())
                group=next(g for g in summary['groups'] if g['source']=='dwd' and g['window']=='shortened')
                results.append({'varied_field':field,'predeclared_bound':bound,'policy':policy,'result':group})
    audit.dump(original/'sensitivity.json',{'analysis_kind':'exploratory_one_variable_at_a_time_after_joint_policy_scoring',
               'new_parameter_values_not_introduced':True,'original_baseline_unmodified':True,'results':results})
    for result in results:
        print(result['varied_field'],result['predeclared_bound'],result['result']['counts'])


if __name__=='__main__':
    main()
