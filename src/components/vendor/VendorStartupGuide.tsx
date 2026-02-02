import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CreditCard, 
  Package, 
  Truck, 
  Palette, 
  Heart, 
  Store,
  CheckCircle,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useVendorOnboardingProgress } from '@/hooks/useVendorOnboardingProgress';
import { VendorThemePreset } from '@/lib/vendorThemePresets';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: React.ReactNode;
  action?: {
    label: string;
    tab: string;
  };
  isOptional?: boolean;
}

interface VendorStartupGuideProps {
  vendorId: string;
  theme?: VendorThemePreset;
  onNavigateToTab: (tab: string) => void;
  onViewStore?: () => void;
}

export const VendorStartupGuide = ({ 
  vendorId, 
  theme, 
  onNavigateToTab,
  onViewStore 
}: VendorStartupGuideProps) => {
  const { completedSteps, isDismissed, loading, toggleStep, setDismissed } = useVendorOnboardingProgress(vendorId);
  const [isExpanded, setIsExpanded] = useState(true);

  const steps: OnboardingStep[] = useMemo(() => [
    {
      id: 'stripe-connect',
      title: 'Complete Stripe Connect',
      description: 'Set up payments to receive earnings',
      icon: <CreditCard className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Stripe Connect allows you to receive payments directly to your bank account.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>No existing Stripe account needed</li>
            <li>Automatic 1099-K tax reporting for qualifying sellers</li>
            <li>Weekly payouts to your linked bank account</li>
            <li>Secure, industry-standard payment processing</li>
          </ul>
        </div>
      ),
      action: { label: 'Go to Payments', tab: 'payments' }
    },
    {
      id: 'first-product',
      title: 'Add Your First Product',
      description: 'List a product in your store',
      icon: <Package className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Create your first product listing to start selling.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use high-quality images (we recommend at least 3)</li>
            <li>Write clear, descriptive titles and descriptions</li>
            <li>Set competitive pricing based on your costs</li>
            <li>Add accurate inventory quantities</li>
          </ul>
        </div>
      ),
      action: { label: 'Go to Products', tab: 'products' }
    },
    {
      id: 'shipping',
      title: 'Set Up Shipping',
      description: 'Configure shipping options and weights',
      icon: <Truck className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Configure how your products will be shipped to customers.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Choose between flat rate or calculated shipping</li>
            <li>Set product weights for accurate shipping costs</li>
            <li>Configure free shipping thresholds to encourage larger orders</li>
            <li>Orders $35+ ship free by default</li>
          </ul>
        </div>
      ),
      action: { label: 'Go to Shipping', tab: 'shipping' }
    },
    {
      id: 'customize-store',
      title: 'Customize Your Store',
      description: 'Add branding and store description',
      icon: <Palette className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Make your store stand out with custom branding.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Choose a theme color that represents your brand</li>
            <li>Write a compelling store description</li>
            <li>Upload a logo or banner image</li>
            <li>Add your store's story and values</li>
          </ul>
        </div>
      ),
      action: { label: 'Go to Settings', tab: 'settings' }
    },
    {
      id: 'link-bestie',
      title: 'Link with a Bestie',
      description: 'Partner with a Bestie for authentic content',
      icon: <Heart className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Connect with a Bestie to feature authentic content in your store.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Get a friend code from a Bestie's guardian</li>
            <li>Request to link and wait for approval</li>
            <li>Once approved, you can request photos and videos</li>
            <li>Featured content builds trust with customers</li>
          </ul>
        </div>
      ),
      action: { label: 'Go to Settings', tab: 'settings' },
      isOptional: true
    },
    {
      id: 'view-store',
      title: 'View Your Public Store',
      description: 'Preview what customers will see',
      icon: <Store className="h-5 w-5" />,
      details: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Check how your store looks to customers.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Review your product listings and images</li>
            <li>Test the shopping experience</li>
            <li>Make sure all information is accurate</li>
            <li>Check mobile responsiveness</li>
          </ul>
        </div>
      )
    }
  ], []);

  const requiredSteps = steps.filter(s => !s.isOptional);
  const completedRequiredCount = requiredSteps.filter(s => completedSteps.includes(s.id)).length;
  const allRequiredComplete = completedRequiredCount === requiredSteps.length;
  const progressPercent = (completedRequiredCount / requiredSteps.length) * 100;

  if (loading) {
    return null;
  }

  // Minimized state when all complete and dismissed
  if (allRequiredComplete && isDismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDismissed(false)}
        className="mb-4 gap-2"
        style={theme ? { 
          borderColor: theme.accent,
          color: theme.accent 
        } : undefined}
      >
        <CheckCircle className="h-4 w-4 text-green-500" />
        Startup Guide Complete - View Again
      </Button>
    );
  }

  return (
    <Card 
      className="border-2 mb-6"
      style={theme ? { 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        boxShadow: theme.cardGlow
      } : undefined}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full bg-primary/10"
                style={theme ? { backgroundColor: `${theme.accent}20` } : undefined}
              >
                <Sparkles 
                  className="h-5 w-5 text-primary" 
                  style={theme ? { color: theme.accent } : undefined}
                />
              </div>
              <div>
                <CardTitle className="text-lg">Vendor Startup Guide</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {completedRequiredCount} of {requiredSteps.length} steps complete
                </p>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 mt-3"
          />
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                
                return (
                  <AccordionItem key={step.id} value={step.id} className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleStep(step.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                        <div 
                          className={cn(
                            "p-1.5 rounded-md",
                            isCompleted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                          )}
                          style={!isCompleted && theme ? { 
                            backgroundColor: `${theme.accent}10`,
                            color: theme.accent 
                          } : undefined}
                        >
                          {step.icon}
                        </div>
                        <div className="text-left">
                          <div className={cn(
                            "font-medium flex items-center gap-2",
                            isCompleted && "text-muted-foreground line-through"
                          )}>
                            {step.title}
                            {step.isOptional && (
                              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-12 pr-4 pb-4">
                      {step.details}
                      <div className="mt-4 flex gap-2">
                        {step.action && (
                          <Button
                            size="sm"
                            onClick={() => onNavigateToTab(step.action!.tab)}
                            style={theme ? { 
                              background: theme.buttonGradient,
                              color: theme.accentText 
                            } : undefined}
                            className={!theme ? "" : "border-0"}
                          >
                            {step.action.label}
                          </Button>
                        )}
                        {step.id === 'view-store' && onViewStore && (
                          <Button
                            size="sm"
                            onClick={onViewStore}
                            style={theme ? { 
                              background: theme.buttonGradient,
                              color: theme.accentText 
                            } : undefined}
                            className={!theme ? "" : "border-0"}
                          >
                            <Store className="mr-2 h-4 w-4" />
                            View My Store
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {allRequiredComplete && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All required steps complete!</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDismissed(true)}
                >
                  Minimize Guide
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
