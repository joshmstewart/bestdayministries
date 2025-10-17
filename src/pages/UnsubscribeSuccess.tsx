import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UnsubscribeSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Successfully Unsubscribed</h1>
          <p className="text-muted-foreground">
            You have been removed from our newsletter mailing list. We're sorry to see you go!
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Changed your mind? You can always subscribe again from our website.
          </p>
          
          <Button 
            onClick={() => navigate("/")} 
            className="w-full"
          >
            Return to Homepage
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            If you believe this was a mistake, please contact us at support@bestdayministries.org
          </p>
        </div>
      </div>
    </div>
  );
}