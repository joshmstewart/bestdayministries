import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, DollarSign, Users, Home, Sparkles, Heart, GraduationCap, Wallet, X } from "lucide-react";

interface SponsorshipBreakdownDialogProps {
  className?: string;
}

export const SponsorshipBreakdownDialog = ({ className }: SponsorshipBreakdownDialogProps) => {
  const [open, setOpen] = useState(false);

  const breakdownItems = [
    {
      icon: DollarSign,
      title: "Direct Compensation",
      description: "Supporting our Besties and their dedicated mentors",
      percentage: "50%",
      color: "text-primary",
      subItems: [
        {
          icon: Wallet,
          title: "Bestie Compensation",
          description: "Paycheck for the Bestie's work and participation",
          percentage: "70%",
          color: "text-primary",
        },
        {
          icon: GraduationCap,
          title: "Mentor Support",
          description: "Dedicated guidance, coaching, and encouragement for our Besties' success",
          percentage: "30%",
          color: "text-primary",
        },
      ],
    },
    {
      icon: Home,
      title: "Rent",
      description: "Venue space and facility costs",
      percentage: "12%",
      color: "text-secondary",
    },
    {
      icon: Users,
      title: "Taxes",
      description: "Payroll taxes and business taxes",
      percentage: "18%",
      color: "text-accent",
    },
    {
      icon: Sparkles,
      title: "Consumables",
      description: "Straws, cups, napkins, and other supplies",
      percentage: "15%",
      color: "text-burnt-orange",
    },
    {
      icon: Heart,
      title: "Insurance",
      description: "Liability and other necessary coverage",
      percentage: "5%",
      color: "text-primary",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 text-xs h-7 ${className}`}
        >
          <Info className="w-3 h-3" />
          Where does the money go?
        </Button>
      </DialogTrigger>
      <DialogContent
        hideCloseButton
        className="max-w-lg"
        aria-describedby="sponsorship-description"
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* Content area - takes up remaining space */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl mb-2">
                <Heart className="w-5 h-5 text-primary" />
                Sponsorship Breakdown
              </DialogTitle>
              <DialogDescription id="sponsorship-description">
                Your sponsorship supports more than just a paycheck—it creates opportunities
                and builds community.
              </DialogDescription>
            </div>
            
            {/* Action buttons container - aligned to right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-3 py-3">
          {breakdownItems.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                <div className={`${item.color} mt-1`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <span className="text-sm font-bold text-primary">{item.percentage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              
              {item.subItems && item.subItems.length > 0 && (
                <div className="ml-8 space-y-1.5">
                  {item.subItems.map((subItem, subIndex) => (
                    <div key={subIndex} className="flex items-start gap-2 p-2 rounded-lg bg-background border border-muted">
                      <div className={`${subItem.color} mt-0.5`}>
                        <subItem.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <h5 className="font-medium text-xs">{subItem.title}</h5>
                          <span className="text-xs font-semibold text-muted-foreground">{subItem.percentage}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">{subItem.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-3 mt-2 space-y-1.5">
          <p className="text-xs text-muted-foreground text-center">
            Every dollar you contribute helps create meaningful opportunities and a supportive
            environment where our Besties can thrive.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Note:</span> All product costs are covered by revenue from sales. Mentor support represents the portion of their time dedicated to instruction and oversight.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
