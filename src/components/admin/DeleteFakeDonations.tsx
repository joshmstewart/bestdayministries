import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FakeDonation {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  created_at: string;
  donor_email: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export function DeleteFakeDonations() {
  const [donations, setDonations] = useState<FakeDonation[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadFakeDonations = async () => {
    setLoading(true);
    try {
      // Query for Joshie S donations with NULL Stripe IDs
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", "ad688e57-6077-455b-853b-a0fd0b458c2e")
        .is("stripe_checkout_session_id", null)
        .is("stripe_customer_id", null)
        .is("stripe_subscription_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDonations(data || []);
      toast({
        title: "Fake Donations Loaded",
        description: `Found ${data?.length || 0} fake donations with no Stripe data`,
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Donations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteFakeDonations = async () => {
    setDeleting(true);
    try {
      const donationIds = donations.map(d => d.id);
      
      const { error } = await supabase
        .from("donations")
        .delete()
        .in("id", donationIds);

      if (error) throw error;

      toast({
        title: "Fake Donations Deleted",
        description: `Successfully deleted ${donationIds.length} fake donations`,
      });

      setDonations([]);
    } catch (error: any) {
      toast({
        title: "Error Deleting Donations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Delete Fake Joshie S Donations
        </CardTitle>
        <CardDescription>
          Identify and delete the 5 fake Joshie S donations that have no Stripe data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will find donations for donor_id ad688e57-6077-455b-853b-a0fd0b458c2e 
            where all Stripe IDs are NULL (never actually processed through Stripe)
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={loadFakeDonations} 
            disabled={loading}
            variant="outline"
          >
            {loading ? "Loading..." : "1. Load Fake Donations"}
          </Button>

          {donations.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  2. Delete {donations.length} Fake Donations
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to permanently delete {donations.length} fake donations with no Stripe data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteFakeDonations}>
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {donations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Donations to be deleted:</h4>
            {donations.map((d) => (
              <div key={d.id} className="text-sm border rounded p-3 space-y-1">
                <div><strong>ID:</strong> {d.id}</div>
                <div><strong>Email:</strong> {d.donor_email || "N/A"}</div>
                <div><strong>Amount:</strong> ${d.amount.toFixed(2)}</div>
                <div><strong>Frequency:</strong> {d.frequency}</div>
                <div><strong>Status:</strong> {d.status}</div>
                <div><strong>Created:</strong> {new Date(d.created_at).toLocaleString()}</div>
                <div className="text-destructive">
                  <strong>Stripe Session ID:</strong> {d.stripe_checkout_session_id || "NULL ❌"}
                </div>
                <div className="text-destructive">
                  <strong>Stripe Customer ID:</strong> {d.stripe_customer_id || "NULL ❌"}
                </div>
                <div className="text-destructive">
                  <strong>Stripe Subscription ID:</strong> {d.stripe_subscription_id || "NULL ❌"}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
