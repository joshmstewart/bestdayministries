import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Image, Users, Eye, ArrowLeft } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { CardCanvas } from "@/components/card-creator/CardCanvas";
import { CardGallery } from "@/components/card-creator/CardGallery";
import { CardCommunityGallery } from "@/components/card-creator/CardCommunityGallery";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { PriceRibbon } from "@/components/ui/price-ribbon";
import { CoinIcon } from "@/components/CoinIcon";
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

interface CardTemplate {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string;
  background_image_url: string | null;
  coin_price: number;
  is_free: boolean;
  category: string | null;
}

interface CardDesign {
  id: string;
  title: string;
  image_url: string;
  template_id: string | null;
  description: string | null;
  difficulty: string | null;
}

export default function CardCreator() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading } = useAuth();
  const { coins, refetch: refetchCoins } = useCoins();
  const [selectedDesign, setSelectedDesign] = useState<CardDesign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [templateToPurchase, setTemplateToPurchase] = useState<CardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  // Fetch preview designs for a template
  const { data: previewDesigns, isLoading: previewLoading } = useQuery({
    queryKey: ["card-designs-preview", previewTemplate?.id],
    queryFn: async () => {
      if (!previewTemplate?.id) return [];
      const { data, error } = await supabase
        .from("card_designs")
        .select("id, title, image_url")
        .eq("template_id", previewTemplate.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!previewTemplate?.id,
  });

  // Fetch all templates with design count
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["card-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_templates")
        .select(`
          *,
          card_designs(count)
        `)
        .eq("is_active", true)
        .order("is_free", { ascending: false })
        .order("coin_price", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as (CardTemplate & { card_designs: { count: number }[] })[];
    },
  });

  // Fetch user's purchased templates
  const { data: purchasedTemplates } = useQuery({
    queryKey: ["user-card-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_card_templates")
        .select("template_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map(p => p.template_id);
    },
    enabled: !!user?.id,
  });

  // Fetch designs for selected template
  const { data: templateDesigns, isLoading: designsLoading } = useQuery({
    queryKey: ["card-designs", selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate?.id) return [];
      const { data, error } = await supabase
        .from("card_designs")
        .select("*")
        .eq("template_id", selectedTemplate.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CardDesign[];
    },
    enabled: !!selectedTemplate?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (template: CardTemplate) => {
      if (!user?.id) throw new Error("Must be logged in");
      if ((coins || 0) < template.coin_price) throw new Error("Not enough coins");
      
      // Get current coins and deduct
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const newBalance = (profile.coins || 0) - template.coin_price;
      
      // Update coins
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coins: newBalance })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
      
      // Record transaction
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: user.id,
          amount: -template.coin_price,
          transaction_type: "purchase",
          description: `Purchased card pack: ${template.title}`,
        });
      if (txError) throw txError;
      
      // Record purchase
      const { error } = await supabase
        .from("user_card_templates")
        .insert({
          user_id: user.id,
          template_id: template.id,
          coins_spent: template.coin_price,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-card-templates"] });
      refetchCoins();
      toast.success("Pack purchased! You can now create cards with all designs.");
      setPurchaseDialogOpen(false);
      if (templateToPurchase) {
        setSelectedTemplate(templateToPurchase);
      }
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to purchase pack", error);
    },
  });

  const hasAccessToTemplate = (template: CardTemplate) => {
    if (template.is_free) return true;
    return purchasedTemplates?.includes(template.id) || false;
  };

  const handleTemplateClick = (template: CardTemplate) => {
    if (hasAccessToTemplate(template)) {
      setSelectedTemplate(template);
    } else if (isAuthenticated) {
      setTemplateToPurchase(template);
      setPurchaseDialogOpen(true);
    } else {
      showErrorToast("Please sign in to purchase packs");
    }
  };

  // Render template designs (like coloring book pages)
  const renderTemplateDesigns = () => (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTemplate(null);
              setSelectedDesign(null);
            }}
            className="px-2"
          >
            Packs
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{selectedTemplate?.title}</span>
        </div>
        {selectedTemplate?.description && (
          <p className="text-sm text-muted-foreground mt-2">{selectedTemplate.description}</p>
        )}
      </div>

      {designsLoading ? (
        <div className="text-center py-12">Loading designs...</div>
      ) : !templateDesigns?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No designs in this pack yet. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templateDesigns.map((design) => (
            <Card
              key={design.id}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
              onClick={() => setSelectedDesign(design)}
            >
              <CardContent className="p-0">
                <img
                  src={design.image_url}
                  alt={design.title}
                  className="w-full aspect-[5/7] object-cover bg-white"
                />
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{design.title}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  // Render the canvas editor
  const renderCanvas = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedTemplate(null);
            setSelectedDesign(null);
          }}
          className="px-2"
        >
          Packs
        </Button>
        <span className="text-muted-foreground">/</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDesign(null)}
          className="px-2"
          disabled={!selectedTemplate}
          title={selectedTemplate ? "Back to designs" : undefined}
        >
          {selectedTemplate?.title || "Designs"}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{selectedDesign?.title}</span>
      </div>

      <CardCanvas 
        design={selectedDesign} 
        onClose={() => setSelectedDesign(null)} 
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-6xl mx-auto px-4">
          <BackButton />
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <CreditCard className="w-8 h-8" />
              Card Creator
            </h1>
            <p className="text-muted-foreground mt-2">
              Pick a card pack and create beautiful cards!
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="templates" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Packs
              </TabsTrigger>
              <TabsTrigger value="community" className="gap-2" disabled={loading || !isAuthenticated}>
                <Users className="w-4 h-4" />
                Community
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2" disabled={loading || !isAuthenticated}>
                <Image className="w-4 h-4" />
                My Cards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates">
              {selectedDesign ? (
                renderCanvas()
              ) : selectedTemplate ? (
                renderTemplateDesigns()
              ) : templatesLoading ? (
                <div className="text-center py-12">Loading packs...</div>
              ) : !templates?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  No card packs available yet. Check back soon!
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...templates]
                    .sort((a, b) => {
                      // Available items first (free or purchased), then purchasable
                      const aHasAccess = hasAccessToTemplate(a);
                      const bHasAccess = hasAccessToTemplate(b);
                      if (aHasAccess && !bHasAccess) return -1;
                      if (!aHasAccess && bHasAccess) return 1;
                      return 0;
                    })
                    .map((template) => {
                    const hasAccess = hasAccessToTemplate(template);
                    return (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden relative group"
                        onClick={() => handleTemplateClick(template)}
                      >
                        <CardContent className="p-0">
                          <div className="relative overflow-hidden">
                            <img
                              src={template.cover_image_url}
                              alt={template.title}
                              className={`w-full h-auto ${!hasAccess ? "opacity-80 grayscale-[30%]" : ""}`}
                            />
                            {template.is_free ? (
                              <PriceRibbon isFree size="md" />
                            ) : !hasAccess && (
                              <PriceRibbon price={template.coin_price} size="md" />
                            )}
                            {/* Preview button for non-owned packs */}
                            {!hasAccess && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTemplate(template);
                                }}
                              >
                                <Eye className="w-3 h-3" />
                                Preview
                              </Button>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-sm truncate">{template.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {(template.card_designs?.[0]?.count || 0)}{" "}
                              {(template.card_designs?.[0]?.count || 0) === 1 ? "card" : "cards"}
                            </p>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="community">
              {user && (
                <CardCommunityGallery userId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="gallery">
              <CardGallery onSelectCard={(card, _, template) => {
                setSelectedDesign(card.design || null);
                if (template) {
                  setSelectedTemplate(template);
                }
                setActiveTab("templates");
              }} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview: {previewTemplate?.title}
              </DialogTitle>
              <DialogDescription>
                {previewTemplate?.description || "See what's inside this card pack before you buy!"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh]">
              {previewLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading preview...</div>
              ) : !previewDesigns?.length ? (
                <div className="text-center py-8 text-muted-foreground">No cards to preview yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-1">
                  {previewDesigns.map((design) => (
                    <div key={design.id} className="space-y-1">
                      <div className="rounded-lg overflow-hidden border bg-white p-1">
                        <img
                          src={design.image_url}
                          alt={design.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center truncate">{design.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span>Price:</span>
                <span className="flex items-center gap-1 font-bold text-primary">
                  <CoinIcon size={14} />
                  {previewTemplate?.coin_price}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (previewTemplate) {
                      setPreviewTemplate(null);
                      setTemplateToPurchase(previewTemplate);
                      setPurchaseDialogOpen(true);
                    }
                  }}
                  disabled={!isAuthenticated}
                >
                  Purchase Pack
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Purchase Dialog */}
        <AlertDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purchase Card Pack</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Would you like to purchase "{templateToPurchase?.title}" for{" "}
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    <CoinIcon size={14} />
                    {templateToPurchase?.coin_price}
                  </span>
                  ?
                </p>
                <p className="text-sm">
                  Your balance:{" "}
                  <span className="inline-flex items-center gap-1 font-bold">
                    <CoinIcon size={14} />
                    {coins || 0}
                  </span>
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => templateToPurchase && purchaseMutation.mutate(templateToPurchase)}
                disabled={(coins || 0) < (templateToPurchase?.coin_price || 0)}
              >
                {(coins || 0) < (templateToPurchase?.coin_price || 0) 
                  ? "Not enough coins" 
                  : "Purchase"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <Footer />
    </div>
  );
}
