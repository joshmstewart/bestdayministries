"""Read-only live profile privacy regressions; requires the audited supporter session."""
import json
import pathlib
import unittest
import requests

ROOT = pathlib.Path(__file__).resolve().parents[2]

class ProfilePrivacy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cfg = {}
        for line in (ROOT / '.env').read_text().splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                cfg[key] = value.strip().strip('"').strip("'")
        cls.base = cfg['VITE_SUPABASE_URL']
        cls.headers = {'apikey': cfg['VITE_SUPABASE_PUBLISHABLE_KEY']}
        cls.session = json.loads(pathlib.Path('/tmp/browser/profile-privacy/supporter-session.json').read_text())
        cls.auth = {**cls.headers, 'Authorization': 'Bearer ' + cls.session['access_token']}

    def get(self, path, auth=True):
        response = requests.get(self.base + '/rest/v1/' + path, headers=self.auth if auth else self.headers, timeout=30)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_supporter_sees_only_own_private_profile(self):
        self.assertEqual(self.get('user_roles?select=role&user_id=eq.' + self.session['user']['id']), [{'role': 'supporter'}])
        rows = self.get('profiles?select=id,email')
        self.assertEqual([row['id'] for row in rows], [self.session['user']['id']])

    def test_public_display_excludes_email_and_friend_code(self):
        for auth in [False, True]:
            rows = self.get('profiles_public?select=*', auth)
            self.assertGreater(len(rows), 1)
            for row in rows:
                self.assertNotIn('email', row)
                self.assertNotIn('friend_code', row)

    def test_anon_has_no_sponsorship_emails(self):
        self.assertEqual(self.get('sponsorships?select=sponsor_email', False), [])

    def test_anon_has_no_private_profiles(self):
        self.assertEqual(self.get('profiles?select=id,email', False), [])