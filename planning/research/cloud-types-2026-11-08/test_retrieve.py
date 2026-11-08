"""Offline retrieval regressions; temporary inputs never enter captured metrics."""
from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import retrieve


class RetrievalTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory=Path(self.temp.name)
        self.cache=self.directory/'cache'
        self.cache.mkdir()
        self.rows=[{'name':name,'href':name} for name in ('known.bin','other.bin')]
        (self.directory/'feed-index.json').write_text(json.dumps({'entries':self.rows}))
        self.log=[{'name':r['name'],'sha256':hashlib.sha256(b'captured').hexdigest()} for r in self.rows]
        self.log_path=self.directory/'retrieval-log.json'
        self.log_path.write_text(json.dumps(self.log))
        for row in self.rows:
            (self.cache/row['name']).write_bytes(b'captured')
        shutil.copyfile(retrieve.HERE/'retrieve.py',self.directory/'retrieve.py')

    def run_cli(self):
        return subprocess.run([sys.executable,str(self.directory/'retrieve.py'),'--cache',str(self.cache)],
                              capture_output=True,text=True)

    def results(self):
        return json.loads((self.cache/'reproduction-retrieval-log.json').read_text())

    def test_unrecorded_file_is_a_per_file_failure_without_losing_known_result(self):
        self.log_path.write_text(json.dumps(self.log[:1]))
        with patch.object(retrieve,'HERE',self.directory),redirect_stdout(io.StringIO()):
            status=retrieve.retrieve(self.cache)
        results=self.results()
        self.assertEqual([r['status'] for r in results],['ok','fetch_error'])
        self.assertIn('recorded',results[1]['error'])
        self.assertEqual(status,1)

    def test_download_failure_keeps_other_results_and_original_provenance(self):
        # Only this one absent cache file reaches the network boundary.
        (self.cache/'other.bin').unlink()
        original=self.log_path.read_bytes()
        with patch.object(retrieve,'HERE',self.directory),redirect_stdout(io.StringIO()), \
                patch.object(retrieve.urllib.request,'urlopen',side_effect=urllib.error.URLError('expired')):
            status=retrieve.retrieve(self.cache)
        self.assertEqual([r['status'] for r in self.results()],['ok','fetch_error'])
        self.assertIn('expired',self.results()[1]['error'])
        self.assertEqual(self.log_path.read_bytes(),original)
        self.assertEqual(status,1)

    def test_cli_hash_failure_exits_nonzero_and_preserves_original_evidence(self):
        (self.cache/'other.bin').write_bytes(b'changed')
        original=self.log_path.read_bytes()
        result=self.run_cli()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual([r['status'] for r in self.results()],['ok','fetch_error'])
        self.assertIn('hash differs',self.results()[1]['error'])
        self.assertEqual(self.log_path.read_bytes(),original)

    def test_cli_missing_or_corrupt_recorded_log_reports_explicit_error(self):
        for content in (None,'not-json','{}','[{"name":"known.bin"}]'):
            with self.subTest(content=content):
                if content is None:
                    self.log_path.unlink()
                else:
                    self.log_path.write_text(content)
                result=self.run_cli()
                self.assertNotEqual(result.returncode,0)
                self.assertIn('recorded retrieval log',result.stderr)
                self.assertIn('retrieval-log.json',result.stderr)
                self.assertNotIn('Traceback',result.stderr)

    def test_cli_verified_cached_capture_exits_zero(self):
        result=self.run_cli()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual([r['status'] for r in self.results()],['ok','ok'])


class ExampleProvenanceTests(unittest.TestCase):
    def test_nearby_only_restatement_does_not_claim_independent_evidence(self):
        examples=json.loads((retrieve.HERE/'field-note-examples.json').read_text())
        by_state={row['state']:row for row in examples}
        nearby=by_state['nearby-only']
        self.assertEqual(nearby.get('restatement_of_state'),'supported-type')
        self.assertTrue(nearby.get('restatement_explanation'))
        original=by_state[nearby['restatement_of_state']]
        self.assertFalse(nearby['synthetic'])
        for field in ('provenance','selected_coordinate','geometry','distance_km',
                      'raw_cloud_type_codes','accepted_genera','observed_at_utc'):
            self.assertEqual(nearby[field],original[field])


if __name__=='__main__':
    unittest.main()
