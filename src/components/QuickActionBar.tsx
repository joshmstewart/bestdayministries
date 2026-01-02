import { Button } from "@/components/ui/button";
import { Gift, Users, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActionBar = () => {
  const navigate = useNavigate();

  const quickActions = [
    { label: "Donate", icon: Gift, path: "/support", color: "bg-primary hover:bg-primary/90" },
    { label: "Sponsor a Bestie", icon: Users, path: "/sponsor-bestie", color: "bg-secondary hover:bg-secondary/90" },
    { label: "Joy House Store", icon: ShoppingBag, path: "/joyhousestore", color: "bg-accent hover:bg-accent/90" },
  ];

  return (
    <div className="bg-muted/50 border-b border-border -mt-4">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {quickActions.map((action) => (
            <Button
              key={action.path}
              size="lg"
              onClick={() => navigate(action.path)}
              className={`${action.color} text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 px-6 py-6 text-base font-semibold`}
            >
              <action.icon className="w-5 h-5 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
