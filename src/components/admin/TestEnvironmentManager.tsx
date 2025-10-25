import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TestEnvironmentManager() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any>(null);
  const { toast } = useToast();

  const handleResetEnvironment = async () => {
    try {
      setIsResetting(true);
      setResetResult(null);

      const { data, error } = await supabase.functions.invoke('reset-test-environment');

      if (error) throw error;

      setResetResult(data);
      toast({
        title: 'Test Environment Reset',
        description: 'Test data has been cleaned and realistic data seeded.',
      });
    } catch (error) {
      console.error('Error resetting test environment:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to reset test environment',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Environment Management</CardTitle>
          <CardDescription>
            Reset test data and seed realistic data for local development and testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will delete all test users (Test*, E2E*, emailtest* patterns) and create fresh,
              realistic test data including guardians, besties, sponsors, discussions, and sticker collections.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              onClick={handleResetEnvironment}
              disabled={isResetting}
              variant="outline"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Test Environment
                </>
              )}
            </Button>
          </div>

          {resetResult && (
            <Alert className={resetResult.success ? 'border-green-500' : 'border-destructive'}>
              {resetResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription>
                {resetResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold">✅ Reset Complete</p>
                    {resetResult.summary && (
                      <div className="text-sm space-y-1">
                        <p><strong>Deleted:</strong> {resetResult.summary.deleted.users} test users</p>
                        <p><strong>Seeded:</strong></p>
                        <ul className="list-disc list-inside ml-4">
                          <li>{resetResult.summary.seeded.guardians} guardians with linked besties</li>
                          <li>{resetResult.summary.seeded.sponsors} sponsors with active sponsorships</li>
                          <li>{resetResult.summary.seeded.discussions} discussion posts</li>
                          <li>{resetResult.summary.seeded.stickerCollections} sticker collection with 5 stickers</li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>❌ {resetResult.error || 'Failed to reset environment'}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Accounts</CardTitle>
          <CardDescription>
            Pre-seeded test accounts for development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Guardians (with linked besties):</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>testguardian1@example.com / testpassword123</li>
                <li>testguardian2@example.com / testpassword123</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Besties:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>testbestie1@example.com / testpassword123</li>
                <li>testbestie2@example.com / testpassword123</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Sponsor (with active $25/month sponsorship):</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>testsponsor@example.com / testpassword123</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Content:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>3 discussion posts (1 pending approval, 2 approved)</li>
                <li>1 sticker collection with 5 stickers (all rarities)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>When to use:</strong> Before running E2E tests locally, after making database schema
            changes, or when test data becomes stale/corrupted.
          </p>
          <p>
            <strong>What it does:</strong> Deletes all test users (and their related data via cascade deletes),
            then creates fresh realistic data with proper relationships.
          </p>
          <p>
            <strong>Safe to use:</strong> Only affects users with test name patterns. Production users and
            data are never touched.
          </p>
          <p>
            <strong>CI/CD:</strong> This runs automatically in CI after test suites complete. Manual reset
            is for local development only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
