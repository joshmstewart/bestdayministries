import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, CheckCircle, AlertCircle, DollarSign } from "lucide-react";

interface VendorPayoutStatusProps {
  transferStatus: string | null;
  stripeTransferId: string | null;
  transferErrorMessage: string | null;
  vendorPayout: number | null;
}

export const VendorPayoutStatus = ({ 
  transferStatus, 
  stripeTransferId, 
  transferErrorMessage,
  vendorPayout 
}: VendorPayoutStatusProps) => {
  const getStatusInfo = () => {
    // Already transferred
    if (stripeTransferId || transferStatus === 'transferred') {
      return {
        label: 'Paid',
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        color: 'bg-green-500 text-white',
        tooltip: `Payment of $${(vendorPayout || 0).toFixed(2)} has been sent to your account`
      };
    }

    // Pending funds - waiting for customer payment to settle
    if (transferStatus === 'pending_funds') {
      return {
        label: 'Processing',
        icon: <Clock className="h-3.5 w-3.5" />,
        color: 'bg-amber-500 text-white',
        tooltip: 'Customer payment is settling (2-3 business days). Your payout will be sent automatically once funds are available.'
      };
    }

    // Failed
    if (transferStatus === 'failed') {
      return {
        label: 'Issue',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        color: 'bg-red-500 text-white',
        tooltip: transferErrorMessage || 'There was an issue with this payout. Our team has been notified.'
      };
    }

    // Pending (not yet attempted)
    return {
      label: 'Queued',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      color: 'bg-blue-500 text-white',
      tooltip: 'Your payout will be processed once you ship the item and customer payment settles.'
    };
  };

  const status = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${status.color} flex items-center gap-1 cursor-help`}>
            {status.icon}
            {status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{status.tooltip}</p>
          {vendorPayout && vendorPayout > 0 && (
            <p className="text-sm font-medium mt-1">
              Amount: ${vendorPayout.toFixed(2)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};