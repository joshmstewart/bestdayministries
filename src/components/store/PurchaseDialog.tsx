import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins } from "lucide-react";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemPrice: number;
  userCoins: number;
  onConfirm: () => void;
  purchasing: boolean;
}

export const PurchaseDialog = ({
  open,
  onOpenChange,
  itemName,
  itemPrice,
  userCoins,
  onConfirm,
  purchasing,
}: PurchaseDialogProps) => {
  const remainingCoins = userCoins - itemPrice;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>Are you sure you want to purchase <strong>{itemName}</strong>?</p>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price:</span>
                <div className="flex items-center gap-2 font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>{itemPrice.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your Balance:</span>
                <div className="flex items-center gap-2 font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>{userCoins.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-muted-foreground">After Purchase:</span>
                <div className="flex items-center gap-2 font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  <span>{remainingCoins.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={purchasing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={purchasing}>
            {purchasing ? "Processing..." : "Confirm Purchase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
