"""Read-only live regression checks. Run using python3 -m unittest discover -s tests/security -p '*_test.py'."""
import json
import pathlib
import unittest
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]

def settings():
    values = {}
    for line in (ROOT / '.env').read_text().splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            values[key] = value.strip().strip('"').strip("'")
    return values

class SponsorshipPrivacy(unittest.TestCase):
    def request(self, path, body=None, token=None):
        cfg = settings()
        headers = {'apikey': cfg['VITE_SUPABASE_PUBLISHABLE_KEY'], 'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(cfg['VITE_SUPABASE_URL'] + path, headers=headers,
            data=json.dumps(body).encode() if body is not None else None)
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)

    def test_signed_out_cannot_read_donor_records(self):
        self.assertEqual(self.request('/rest/v1/sponsorships?select=id,sponsor_email,stripe_customer_id&limit=3'), [])

    def test_unrelated_supporter_cannot_read_donor_records(self):
        session = json.loads((pathlib.Path.home() / '.cache/lovable-auth/session.json').read_text())['session']
        roles = self.request('/rest/v1/user_roles?select=role&user_id=eq.' + session['user']['id'], token=session['access_token'])
        self.assertEqual([r['role'] for r in roles], ['supporter'], 'Mint an unrelated supporter session before this regression test')
        self.assertEqual(self.request('/rest/v1/sponsorships?select=id,sponsor_email,stripe_subscription_id&limit=3', token=session['access_token']), [])

    def test_public_funding_returns_only_aggregate_fields(self):
        totals = self.request('/rest/v1/rpc/get_sponsorship_funding_totals', {})
        self.assertGreater(len(totals), 0)
        allowed = {'sponsor_bestie_id', 'stripe_mode', 'current_monthly_pledges', 'stable_amount', 'ending_amount', 'monthly_goal', 'funding_percentage', 'remaining_needed'}
        for row in totals:
            self.assertEqual(set(row), allowed)

    def test_cors_all_functions_allow_browser_runtime_headers(self):
        cfg = settings()
        needed = {'authorization', 'apikey', 'content-type', 'x-client-info', 'x-supabase-client-platform', 'x-supabase-client-platform-version', 'x-supabase-client-runtime', 'x-supabase-client-runtime-version'}
        for file in (ROOT / 'supabase/functions').glob('*/index.ts'):
            with self.subTest(function=file.parent.name):
                req = urllib.request.Request(cfg['VITE_SUPABASE_URL'] + '/functions/v1/' + file.parent.name, method='OPTIONS', headers={'Origin': 'http://localhost:8080', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': ','.join(needed)})
                with urllib.request.urlopen(req, timeout=30) as response:
                    response.read()
                    self.assertIn(response.headers['Access-Control-Allow-Origin'], ['*', 'http://localhost:8080'])
                    allowed = {h.strip().lower() for h in response.headers['Access-Control-Allow-Headers'].split(',')}
                    self.assertTrue(needed <= allowed)

if __name__ == '__main__':
    unittest.main()
