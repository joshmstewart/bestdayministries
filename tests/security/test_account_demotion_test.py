"""Read-only live denial checks using the pre-demotion test-admin session."""
import json
import os
import pathlib
import unittest

import requests

ROOT = pathlib.Path(__file__).resolve().parents[2]


class TestAccountDemotion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cfg = {}
        for line in (ROOT / '.env').read_text().splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                cfg[key] = value.strip().strip('"').strip("'")
        cls.base = cfg['VITE_SUPABASE_URL']
        session_path = os.environ.get('TEST_DEMOTION_SESSION_FILE', '/tmp/browser/test-role-remediation/session.json')
        cls.session = json.loads(pathlib.Path(session_path).read_text())
        if cls.session['user']['email'] != 'testadmin@example.com':
            raise RuntimeError('This regression must use the audited test-admin account only')
        cls.headers = {
            'apikey': cfg['VITE_SUPABASE_PUBLISHABLE_KEY'],
            'Authorization': 'Bearer ' + cls.session['access_token'],
        }

    def get(self, path):
        response = requests.get(self.base + '/rest/v1/' + path, headers=self.headers, timeout=30)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_exactly_one_supporter_role(self):
        rows = self.get('user_roles?select=role&user_id=eq.' + self.session['user']['id'])
        self.assertEqual(rows, [{'role': 'supporter'}])

    def test_no_admin_test_run_data(self):
        self.assertEqual(self.get('test_runs?select=id'), [])

    def test_no_unpublished_newsletter_data(self):
        self.assertEqual(self.get('newsletter_campaigns?select=id&status=neq.sent'), [])

    def test_no_other_private_profiles(self):
        rows = self.get('profiles?select=id')
        self.assertEqual([r['id'] for r in rows], [self.session['user']['id']])


if __name__ == '__main__':
    unittest.main()