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
    <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border -mt-24">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap justify-center gap-4 md:gap-10">
          {quickActions.map((action, index) => (
            <Button
              key={action.path}
              size="lg"
              onClick={() => navigate(action.path)}
              className={`${action.color} text-primary-foreground shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-8 py-7 text-lg font-bold rounded-xl animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <action.icon className="w-6 h-6 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
