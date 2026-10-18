"""Read-only live trigger regressions: python3 -m unittest discover -s tests/security -p 'signup_roles_test.py'."""
import json
import pathlib
import re
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]

class SignupRoles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run([
            'lovable', 'supabase', 'query',
            "SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) AS definition", '--json',
        ], capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        # CLI response envelopes vary; locate the returned definition without logging it.
        def find(value):
            if isinstance(value, dict):
                if 'definition' in value:
                    return value['definition']
                for child in value.values():
                    found = find(child)
                    if found:
                        return found
            if isinstance(value, list):
                for child in value:
                    found = find(child)
                    if found:
                        return found
            return None
        cls.definition = find(data)
        if not cls.definition:
            raise AssertionError('Live trigger definition not returned')
        match = re.search(r'CASE\s+WHEN NEW.raw_user_meta_data.*?\bEND', cls.definition, re.S)
        if not match:
            raise AssertionError('Live trigger role allowlist missing')
        expression = match.group(0).replace('NEW.raw_user_meta_data', 'metadata')
        cases = ['bestie', 'caregiver', 'supporter', 'admin', 'owner', 'moderator', 'vendor', '', 'unknown', 'ADMIN', None]
        values = ','.join("('{}'::jsonb)".format(json.dumps({} if role is None else {'role': role})) for role in cases)
        query = f'SELECT metadata, ({expression})::text AS assigned_role FROM (VALUES {values}) AS input(metadata)'
        output = subprocess.run(['lovable', 'supabase', 'query', query, '--json'], capture_output=True, text=True, check=True)
        payload = json.loads(output.stdout)
        def rows(value):
            if isinstance(value, list) and value and isinstance(value[0], dict) and 'assigned_role' in value[0]:
                return value
            if isinstance(value, dict):
                for child in value.values():
                    found = rows(child)
                    if found:
                        return found
            return None
        cls.results = rows(payload)
        if not cls.results or len(cls.results) != len(cases):
            raise AssertionError('All role cases must be evaluated in the live database')

    def assert_role(self, supplied, expected):
        row = next(r for r in self.results if r['metadata'].get('role') == supplied)
        self.assertEqual(row['assigned_role'], expected)

    def test_bestie_allowed(self): self.assert_role('bestie', 'bestie')
    def test_caregiver_allowed(self): self.assert_role('caregiver', 'caregiver')
    def test_supporter_allowed(self): self.assert_role('supporter', 'supporter')
    def test_admin_denied(self): self.assert_role('admin', 'supporter')
    def test_owner_denied(self): self.assert_role('owner', 'supporter')
    def test_moderator_denied(self): self.assert_role('moderator', 'supporter')
    def test_vendor_denied(self): self.assert_role('vendor', 'supporter')
    def test_empty_defaults(self): self.assert_role('', 'supporter')
    def test_unknown_defaults(self): self.assert_role('unknown', 'supporter')
    def test_case_sensitive_defaults(self): self.assert_role('ADMIN', 'supporter')
    def test_missing_defaults(self): self.assert_role(None, 'supporter')

    def test_other_trigger_behavior_identical(self):
        original = (ROOT / 'supabase/migrations/20260824015014_44042883-ecee-4dc2-9f13-1d8143dfbd2b.sql').read_text()
        normalized = re.sub(r'CASE\s+WHEN NEW.raw_user_meta_data.*?\bEND',
            "COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'supporter')", self.definition, count=1, flags=re.S)
        self.assertEqual(normalized.strip().rstrip(';'), original.strip().rstrip(';'))

if __name__ == '__main__':
    unittest.main()