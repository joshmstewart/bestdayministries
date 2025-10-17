import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UnsubscribeError() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Unsubscribe Failed</h1>
          <p className="text-muted-foreground">
            We encountered an error while processing your unsubscribe request. This could be because:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside text-left space-y-1 mt-4">
            <li>The unsubscribe link has expired</li>
            <li>You've already been unsubscribed</li>
            <li>The link is invalid or corrupted</li>
          </ul>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            If you continue to receive emails, please contact us directly.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate("/contact")} 
              className="w-full"
            >
              Contact Support
            </Button>
            
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              className="w-full"
            >
              Return to Homepage
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Email: support@bestdayministries.org
          </p>
        </div>
      </div>
    </div>
  );
}