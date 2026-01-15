import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Image, Users, Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { CardCanvas } from "@/components/card-creator/CardCanvas";
import { CardGallery } from "@/components/card-creator/CardGallery";
import { CardCommunityGallery } from "@/components/card-creator/CardCommunityGallery";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";
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

export default function CardCreator() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading } = useAuth();
  const { coins, refetch: refetchCoins } = useCoins();
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [templateToPurchase, setTemplateToPurchase] = useState<CardTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  // Fetch all templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["card-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_free", { ascending: false })
        .order("coin_price", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CardTemplate[];
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
          description: `Purchased card template: ${template.title}`,
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
      toast.success("Template purchased! You can now create cards with it.");
      setPurchaseDialogOpen(false);
      if (templateToPurchase) {
        setSelectedTemplate(templateToPurchase);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const hasAccessToTemplate = (template: CardTemplate) => {
    if (template.is_free) return true;
    return purchasedTemplates?.includes(template.id) || false;
  };

  const handleTemplateClick = (template: CardTemplate) => {
    if (hasAccessToTemplate(template)) {
      setSelectedTemplate(template);
      setEditingCard(null);
    } else if (isAuthenticated) {
      setTemplateToPurchase(template);
      setPurchaseDialogOpen(true);
    } else {
      toast.error("Please sign in to purchase templates");
    }
  };

  const handleCardSelect = (card: any) => {
    setEditingCard(card);
    setSelectedTemplate(null);
    setActiveTab("templates");
  };

  const handleCreateBlank = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create cards");
      return;
    }
    setSelectedTemplate({ 
      id: 'blank', 
      title: 'Blank Card', 
      description: null,
      cover_image_url: '',
      background_image_url: null,
      coin_price: 0,
      is_free: true,
      category: null,
    });
    setEditingCard(null);
  };

  const renderTemplates = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Blank card option */}
      <Card
        className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
        onClick={handleCreateBlank}
      >
        <CardContent className="p-0">
          <div className="aspect-[5/7] bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-2">
            <Plus className="w-12 h-12 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Blank Card</span>
          </div>
          <div className="p-3">
            <h3 className="font-medium text-sm">Start from Scratch</h3>
            <p className="text-xs text-muted-foreground">Create your own design</p>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      {templates?.map((template) => {
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
                  className={`w-full aspect-[5/7] object-cover ${!hasAccess ? "opacity-80 grayscale-[30%]" : ""}`}
                />
                {template.is_free ? (
                  <PriceRibbon isFree size="md" />
                ) : !hasAccess && (
                  <PriceRibbon price={template.coin_price} size="md" />
                )}
                {/* Preview button for non-owned templates */}
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
                {template.category && (
                  <p className="text-xs text-muted-foreground capitalize">{template.category}</p>
                )}
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
  );

  const renderCanvas = () => (
    <CardCanvas
      template={selectedTemplate?.id === 'blank' ? null : selectedTemplate}
      savedCard={editingCard}
      onClose={() => {
        setSelectedTemplate(null);
        setEditingCard(null);
      }}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ["user-cards"] });
      }}
    />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <CreditCard className="w-8 h-8" />
              Card Creator
            </h1>
            <p className="text-muted-foreground mt-2">
              Create beautiful cards to share with friends and family!
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
              <TabsTrigger value="templates" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Templates
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
              {selectedTemplate || editingCard ? (
                renderCanvas()
              ) : templatesLoading ? (
                <div className="text-center py-12">Loading templates...</div>
              ) : (
                renderTemplates()
              )}
            </TabsContent>

            <TabsContent value="community">
              {user && (
                <CardCommunityGallery userId={user.id} />
              )}
            </TabsContent>

            <TabsContent value="gallery">
              <CardGallery onSelectCard={handleCardSelect} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview: {previewTemplate?.title}
              </DialogTitle>
              <DialogDescription>
                {previewTemplate?.description || "See what this card template looks like!"}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg overflow-hidden border bg-white p-2">
              <img
                src={previewTemplate?.cover_image_url}
                alt={previewTemplate?.title}
                className="w-full h-auto object-contain"
              />
            </div>
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
                  Purchase Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Purchase Dialog */}
        <AlertDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purchase Template</AlertDialogTitle>
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
