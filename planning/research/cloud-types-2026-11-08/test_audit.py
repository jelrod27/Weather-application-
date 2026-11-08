"""Research regression checks; synthetic cases below never enter sample metrics."""
from contextlib import redirect_stdout
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import audit


class MappingTests(unittest.TestCase):
    def test_ambiguous_alternatives_do_not_become_two_confirmed_genera(self):
        r=audit.classify([22],100)
        self.assertEqual(r['accepted_genera'],[])
        self.assertEqual(r['alternatives'][0]['genera'],['Altostratus','Nimbostratus'])
        self.assertEqual(r['status'],'ambiguous_type')

    def test_pannus_may_be_either_or_both(self):
        r=audit.classify([37,61,60],100)
        self.assertEqual(r['accepted_genera'],[])
        self.assertTrue(r['alternatives'][0]['one_or_both'])

    def test_explicit_multiple_genus_and_optional_genus_remain_distinct(self):
        self.assertEqual(audit.classify([38],100)['accepted_genera'],['Cumulus','Stratocumulus'])
        r=audit.classify([15],100)
        self.assertEqual(r['accepted_genera'],['Cirrostratus'])
        self.assertEqual(r['optional_genera'][0]['not_confirmed'],['Cirrus'])
        self.assertEqual(audit.classify([27],100)['accepted_genera'],['Altocumulus'])

    def test_missing_is_not_clear_and_one_absent_layer_is_not_a_clear_sky(self):
        for codes in ([],[63],[10],[20,30]):
            self.assertEqual(audit.classify(codes,None)['status'],'missing')
        self.assertEqual(audit.classify([10,20,30],None)['status'],'cloud_free_within_source_limits')

    def test_clear_code_conflicting_with_genus_abstains(self):
        for codes in ([43,8],[10,20,30,8],[43,22],[10,20,30,22]):
            for cover in (None,0,100):
                with self.subTest(codes=codes,cover=cover):
                    result=audit.classify(codes,cover)
                    self.assertEqual(result['status'],'unclassified')
                    self.assertEqual(result['accepted_genera'],[])

    def test_clear_code_conflicting_with_positive_cover_abstains(self):
        for codes in ([43],[10,20,30]):
            with self.subTest(codes=codes):
                self.assertEqual(audit.classify(codes,100)['status'],'unclassified')
                for cover in (None,0):
                    self.assertEqual(audit.classify(codes,cover)['status'],'cloud_free_within_source_limits')

    def test_obscuration_coarse_categories_and_contradictions_abstain(self):
        self.assertEqual(audit.classify([59],None)['status'],'obscured')
        self.assertEqual(audit.classify([40],100)['status'],'unclassified')
        self.assertEqual(audit.classify([50],0)['status'],'unclassified')
        self.assertEqual(audit.classify([35],0)['status'],'unclassified')
        self.assertEqual(audit.classify([35,60],100)['obscured_codes'],[60])


class RealDecodingTests(unittest.TestCase):
    def test_original_bufr_subsets_match_independent_subset_selectors(self):
        import eccodes as ec
        fixture_dir=audit.HERE/'fixtures'
        fixtures=json.loads((fixture_dir/'provenance.json').read_text())
        for fixture in fixtures:
            with self.subTest(fixture=fixture['label']):
                raw=(fixture_dir/fixture['file']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(),fixture['fixture_sha256'])
                self.assertFalse(fixture['synthetic'])
                h=ec.codes_new_from_message(raw)
                ec.codes_set(h,'unpack',1)
                expected=fixture['expected']
                prefix=f"/subsetNumber={expected['subset']}/"
                # Conditional access reads the original multi-station bulletin without
                # invoking the helper's extraction/re-encoding path.
                original_codes=[audit.clean(x) for x in ec.codes_get_array(h,prefix+'cloudType')]
                original_codes=[x for x in original_codes if x is not None]
                single=audit.extract_subset(ec,h,expected['subset'])
                try:
                    self.assertEqual(ec.codes_get(single,'numberOfSubsets'),1)
                    self.assertAlmostEqual(ec.codes_get(single,'latitude'),expected['latitude'])
                    self.assertAlmostEqual(ec.codes_get(single,'longitude'),expected['longitude'])
                    self.assertAlmostEqual(ec.codes_get(h,prefix+'latitude'),expected['latitude'])
                    extracted_codes=[audit.clean(x) for x in ec.codes_get_array(single,'cloudType')]
                    self.assertEqual([x for x in extracted_codes if x is not None],original_codes)
                    self.assertEqual(original_codes,expected['raw_codes'])
                    result=audit.classify(original_codes,expected['total_cloud_cover'])
                    self.assertEqual(result['accepted_genera'],expected['accepted_genera'])
                    self.assertEqual(result['status'],expected['status'])
                finally:
                    ec.codes_release(single)
                    ec.codes_release(h)


class AggregationTests(unittest.TestCase):
    def test_committed_slots_include_retention_and_blocked_sources(self):
        summary=json.loads((audit.HERE/'summary.json').read_text())
        with gzip.open(audit.HERE/'slots.jsonl.gz','rt') as f:
            slots=[json.loads(x) for x in f]
        self.assertEqual(len(slots),10080)
        for g in summary['groups']:
            subset=[r for r in slots if r['source']==g['source'] and r['policy']==g['policy'] and (g['window']=='requested' or r['in_shortened_window'])]
            self.assertEqual(g['n'],len(subset))
            self.assertEqual(sum(g['counts'].values()),len(subset))
            self.assertEqual(len({(r['location'],r['slot_utc']) for r in subset}),len(subset))
            for status in ('explicit_genus','ambiguous_type','cloud_free_within_source_limits','obscured','stale','missing','unsupported','unclassified'):
                self.assertEqual(g['counts'][status],sum(r['status']==status for r in subset))
        self.assertEqual(sum(r['source']=='dwd' and r['policy']=='baseline' and r['reason']=='outside_retained_window' for r in slots),1740)
        self.assertEqual(sum(r['source']=='meteomatics' and r['status']=='unsupported' for r in slots),2016)

    def test_synthetic_failed_and_stale_slots_are_never_removed_from_denominator(self):
        # This isolated three-hour source window is synthetic test input only.
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp)
            manifest={'locations':[{'id':'test','latitude':0,'longitude':0,'reference_elevation_m':0}],
                      'requested_window':{'start':'2026-11-01T00:00:00Z'},
                      'policies':{'baseline':{'max_distance_km':50,'max_elevation_difference_m':300,'max_age_minutes':90}}}
            (directory/'sampling-manifest.json').write_text(json.dumps(manifest))
            (directory/'retrieval-log.json').write_text(json.dumps([{'listing_modified_utc':'2026-11-07T20:01:00Z','status':'fetch_error'}]))
            report={'latitude':0,'longitude':0,'elevation_m':0,'observed_at_utc':'2026-11-07T20:00:00Z','feed_modified_at_utc':'2026-11-07T20:01:00Z','status':'explicit_genus','file':'synthetic','message_index':1,'subset':1,'station_id':'synthetic','accepted_genera':['Cumulus'],'raw_codes':[8],'alternatives':[]}
            with gzip.open(directory/'reports.jsonl.gz','wt') as f:
                f.write(json.dumps(report)+'\n')
            with patch.object(audit,'HERE',directory),redirect_stdout(io.StringIO()):
                audit.score()
            with gzip.open(directory/'slots.jsonl.gz','rt') as f:
                slots=[json.loads(x) for x in f if json.loads(x)['source']=='dwd']
            self.assertEqual(len(slots),168)
            self.assertEqual(sum(r['status']=='missing' for r in slots),165)
            self.assertEqual(sum(r['status']=='explicit_genus' for r in slots),1)
            self.assertEqual(sum(r['status']=='stale' for r in slots),2)

    def test_solar_sampling_context_includes_day_and_night(self):
        noon=datetime(2026,11,8,12,tzinfo=timezone.utc)
        midnight=noon.replace(hour=0)
        self.assertEqual(audit.solar_period(noon,0,0),'day')
        self.assertEqual(audit.solar_period(midnight,0,0),'night')


if __name__=='__main__':
    unittest.main()
