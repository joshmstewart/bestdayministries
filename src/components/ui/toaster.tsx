import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast as showToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast({
        title: "Copied!",
        description: "Error message copied to clipboard",
      });
    });
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isError = variant === "destructive";
        const descriptionText = typeof description === 'string' ? description : '';
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <div className="flex items-start gap-2">
                  <ToastDescription className="flex-1">{description}</ToastDescription>
                  {isError && descriptionText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copyToClipboard(descriptionText)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
