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
import { Info, DollarSign, Users, Home, Sparkles, Heart } from "lucide-react";

interface SponsorshipBreakdownDialogProps {
  className?: string;
}

export const SponsorshipBreakdownDialog = ({ className }: SponsorshipBreakdownDialogProps) => {
  const [open, setOpen] = useState(false);

  const breakdownItems = [
    {
      icon: DollarSign,
      title: "Direct Compensation",
      description: "Paycheck for the Bestie's work and participation",
      percentage: "60%",
      color: "text-primary",
    },
    {
      icon: Users,
      title: "Support Staff",
      description: "Caregivers and coordinators who provide guidance",
      percentage: "15%",
      color: "text-secondary",
    },
    {
      icon: Home,
      title: "Facilities & Materials",
      description: "Venue space, supplies, and equipment",
      percentage: "15%",
      color: "text-accent",
    },
    {
      icon: Sparkles,
      title: "Programs & Activities",
      description: "Events, workshops, and community experiences",
      percentage: "10%",
      color: "text-burnt-orange",
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-5 h-5 text-primary" />
            Sponsorship Breakdown
          </DialogTitle>
          <DialogDescription>
            Your sponsorship supports more than just a paycheck—it creates opportunities
            and builds community.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {breakdownItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
          ))}
        </div>

        <div className="border-t pt-4 mt-2">
          <p className="text-xs text-muted-foreground text-center">
            Every dollar you contribute helps create meaningful opportunities and a supportive
            environment where our Besties can thrive.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
