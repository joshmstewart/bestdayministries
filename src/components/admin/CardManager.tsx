import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, Edit, Eye, EyeOff, Sparkles, Loader2, RefreshCw, 
  CreditCard, Coins, ImageOff, Wand2, Check, Upload, Archive, ArchiveRestore
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

interface CardTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string;
  background_image_url: string | null;
  coin_price: number;
  is_free: boolean;
  is_active: boolean;
  display_order: number;
}

interface CardDesign {
  id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  difficulty: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

export function CardManager() {
  const queryClient = useQueryClient();
  
  // Template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: "",
    description: "",
    category: "general",
    coin_price: 0,
    is_free: true,
    display_order: 0,
  });
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Design state
  const [templateDesigns, setTemplateDesigns] = useState<Record<string, CardDesign[]>>({});
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [newDesignName, setNewDesignName] = useState("");
  const [addingDesign, setAddingDesign] = useState(false);
  const [uploadingDesignFor, setUploadingDesignFor] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [editingDesign, setEditingDesign] = useState<CardDesign | null>(null);
  const [editDesignName, setEditDesignName] = useState("");

  // Idea generation state
  const [generatingIdeas, setGeneratingIdeas] = useState<string | null>(null);
  const [designIdeas, setDesignIdeas] = useState<Record<string, string[]>>({});
  const [selectedIdeas, setSelectedIdeas] = useState<Record<string, Set<string>>>({});
  const [generatingFromIdeas, setGeneratingFromIdeas] = useState<string | null>(null);
  
  // Filter state
  const [showArchived, setShowArchived] = useState(false);
  const [ideaProgress, setIdeaProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-card-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_templates")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CardTemplate[];
    },
  });

  // Fetch designs for each template
  useEffect(() => {
    if (templates) {
      templates.forEach(async (template) => {
        const { data, error } = await supabase
          .from("card_designs")
          .select("*")
          .eq("template_id", template.id)
          .order("display_order", { ascending: true });
        if (!error && data) {
          setTemplateDesigns((prev) => ({ ...prev, [template.id]: data }));
        }
      });
    }
  }, [templates]);

  // Generate description from title
  const handleGenerateDescription = async () => {
    if (!templateFormData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-card-template-description", {
        body: { templateTitle: templateFormData.title },
      });

      if (error) throw error;
      
      if (data?.description) {
        setTemplateFormData(prev => ({ ...prev, description: data.description }));
        toast.success("Description generated!");
      }
    } catch (error: any) {
      showErrorToastWithCopy("Failed to generate description", error);
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Generate cover image
  const generateCover = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("generate-card-template-cover", {
      body: { prompt },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  // Generate card design image (line art for coloring)
  const generateDesignImage = async (prompt: string, templateId?: string | null): Promise<string> => {
    const templateCategory = templateId ? templates?.find((t) => t.id === templateId)?.category : null;
    const subject = templateCategory ? `${prompt}. Theme: ${templateCategory} card design` : prompt;

    const fullPrompt = `Create a coloring card design line drawing. Subject: ${subject}.

ABSOLUTELY CRITICAL - BLACK AND WHITE ONLY:
- ONLY black lines on a pure white background - NO COLOR WHATSOEVER
- No gray, no shading, no gradients, no colored fills - ONLY black outlines
- This is a card design for coloring - users will add their own colors

DRAWING REQUIREMENTS:
- Create a greeting card style design with the subject as the main focus
- NO text, words, letters, or captions anywhere
- ALL outlines must be FULLY CLOSED with no gaps (for paint bucket fill tools)
- Thick, clean black outlines only
- Simple cartoon style suitable for coloring
- Subject should fill most of the image
- Design should work well as a card front`;

    const { data, error } = await supabase.functions.invoke("generate-card-design", {
      body: { prompt: fullPrompt },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateCover = async (templateId?: string) => {
    const prompt = templateId ? templates?.find(t => t.id === templateId)?.title : coverPrompt;
    if (!prompt?.trim()) return;
    
    setGeneratingCover(templateId || "new");
    try {
      const imageUrl = await generateCover(prompt);
      
      if (templateId) {
        const { error } = await supabase
          .from("card_templates")
          .update({ cover_image_url: imageUrl })
          .eq("id", templateId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
        toast.success("Cover regenerated!");
      } else {
        setGeneratedCoverUrl(imageUrl);
        setTemplateImageFile(null);
        toast.success("Cover generated!");
      }
    } catch (error) {
      showErrorToastWithCopy("Generating cover", error);
    } finally {
      setGeneratingCover(null);
    }
  };

  // Add design and generate image
  const handleAddDesign = async (templateId: string) => {
    if (!newDesignName.trim()) return;
    
    setAddingDesign(true);
    try {
      const imageUrl = await generateDesignImage(newDesignName, templateId);
      
      const { error: insertError } = await supabase
        .from("card_designs")
        .insert({
          title: newDesignName,
          template_id: templateId,
          description: newDesignName,
          image_url: imageUrl,
          display_order: (templateDesigns[templateId]?.length || 0),
        });
      
      if (insertError) throw insertError;
      
      const { data: designs } = await supabase
        .from("card_designs")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order", { ascending: true });
      
      if (designs) {
        setTemplateDesigns((prev) => ({ ...prev, [templateId]: designs }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
      setNewDesignName("");
      toast.success("Card design added!");
    } catch (error) {
      showErrorToastWithCopy("Adding design", error);
    } finally {
      setAddingDesign(false);
    }
  };

  // Upload design image
  const handleUploadDesign = async (templateId: string, file: File, title: string) => {
    setUploadingDesignFor(templateId);
    try {
      const compressed = await compressImage(file);
      const sanitizedName = file.name.replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(`card-designs/${fileName}`, compressed);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(`card-designs/${fileName}`);
      
      const { error: insertError } = await supabase
        .from("card_designs")
        .insert({
          title: title || file.name.replace(/\.[^/.]+$/, ""),
          template_id: templateId,
          image_url: urlData.publicUrl,
          display_order: (templateDesigns[templateId]?.length || 0),
        });
      
      if (insertError) throw insertError;
      
      const { data: designs } = await supabase
        .from("card_designs")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order", { ascending: true });
      
      if (designs) {
        setTemplateDesigns((prev) => ({ ...prev, [templateId]: designs }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
      setNewDesignName("");
      toast.success("Design uploaded!");
    } catch (error) {
      showErrorToastWithCopy("Uploading design", error);
    } finally {
      setUploadingDesignFor(null);
    }
  };

  const handleRegenerateDesign = async (design: CardDesign) => {
    setRegeneratingId(design.id);
    try {
      const imageUrl = await generateDesignImage(design.description || design.title, design.template_id);
      
      const { error } = await supabase
        .from("card_designs")
        .update({ image_url: imageUrl })
        .eq("id", design.id);
      
      if (error) throw error;
      
      if (design.template_id) {
        const { data: designs } = await supabase
          .from("card_designs")
          .select("*")
          .eq("template_id", design.template_id)
          .order("display_order", { ascending: true });
        
        if (designs) {
          setTemplateDesigns((prev) => ({ ...prev, [design.template_id!]: designs }));
        }
      }
      
      toast.success("Image regenerated!");
    } catch (error) {
      showErrorToastWithCopy("Regenerating image", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Archive/restore design
  const handleToggleDesignActive = async (design: CardDesign) => {
    const newActiveState = !design.is_active;
    try {
      const { error } = await supabase
        .from("card_designs")
        .update({ is_active: newActiveState })
        .eq("id", design.id);
      
      if (error) throw error;
      
      if (design.template_id) {
        setTemplateDesigns((prev) => ({
          ...prev,
          [design.template_id!]: prev[design.template_id!]?.map((d) =>
            d.id === design.id ? { ...d, is_active: newActiveState } : d
          ) || [],
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
      toast.success(newActiveState ? "Design restored!" : "Design archived!");
    } catch (error) {
      showErrorToastWithCopy(newActiveState ? "Restoring design" : "Archiving design", error);
    }
  };

  // Update design name
  const handleUpdateDesignName = async (design: CardDesign, newName: string) => {
    if (!newName.trim()) {
      toast.error("Design name cannot be empty");
      return;
    }
    try {
      const { error } = await supabase
        .from("card_designs")
        .update({ title: newName.trim() })
        .eq("id", design.id);
      
      if (error) throw error;
      
      if (design.template_id) {
        setTemplateDesigns((prev) => ({
          ...prev,
          [design.template_id!]: prev[design.template_id!]?.map((d) =>
            d.id === design.id ? { ...d, title: newName.trim() } : d
          ) || [],
        }));
      }
      
      setEditingDesign(null);
      setEditDesignName("");
      toast.success("Design name updated!");
    } catch (error) {
      showErrorToastWithCopy("Updating design name", error);
    }
  };

  const handleGenerateIdeas = async (template: CardTemplate) => {
    setGeneratingIdeas(template.id);
    try {
      const existingDesigns = templateDesigns[template.id] || [];
      const existingTitles = existingDesigns
        .filter(design => design.is_active !== false)
        .map(design => design.title);
      
      const { data, error } = await supabase.functions.invoke("generate-card-design-ideas", {
        body: { 
          templateTitle: template.title, 
          templateDescription: template.description,
          category: template.category,
          existingTitles: existingTitles,
        },
      });
      
      if (error) throw error;
      
      setDesignIdeas((prev) => ({ ...prev, [template.id]: data.ideas || [] }));
      setSelectedIdeas((prev) => ({ ...prev, [template.id]: new Set() }));
      toast.success(`Generated ${data.ideas?.length || 0} design ideas!`);
    } catch (error) {
      showErrorToastWithCopy("Generating ideas", error);
    } finally {
      setGeneratingIdeas(null);
    }
  };

  const toggleIdeaSelection = (templateId: string, idea: string) => {
    setSelectedIdeas((prev) => {
      const current = prev[templateId] || new Set();
      const newSet = new Set(current);
      if (newSet.has(idea)) {
        newSet.delete(idea);
      } else {
        newSet.add(idea);
      }
      return { ...prev, [templateId]: newSet };
    });
  };

  const toggleAllIdeas = (templateId: string, selectAll: boolean) => {
    const ideas = designIdeas[templateId] || [];
    setSelectedIdeas((prev) => ({
      ...prev,
      [templateId]: selectAll ? new Set(ideas) : new Set(),
    }));
  };

  const handleGenerateFromIdeas = async (templateId: string) => {
    const selected = Array.from(selectedIdeas[templateId] || []);
    if (selected.length === 0) {
      toast.error("Select at least one idea to generate");
      return;
    }
    
    setGeneratingFromIdeas(templateId);
    setIdeaProgress({ current: 0, total: selected.length });
    
    let successCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const idea = selected[i];
      setIdeaProgress({ current: i + 1, total: selected.length });
      
      try {
        const imageUrl = await generateDesignImage(idea, templateId);
        
        const { error: insertError } = await supabase
          .from("card_designs")
          .insert({
            title: idea,
            template_id: templateId,
            description: idea,
            image_url: imageUrl,
            display_order: (templateDesigns[templateId]?.length || 0) + i,
          });
        
        if (insertError) throw insertError;
        successCount++;
      } catch (error) {
        console.error(`Failed to generate design for "${idea}":`, error);
      }
    }
    
    const { data: designs } = await supabase
      .from("card_designs")
      .select("*")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true });
    
    if (designs) {
      setTemplateDesigns((prev) => ({ ...prev, [templateId]: designs }));
    }
    
    setSelectedIdeas((prev) => ({ ...prev, [templateId]: new Set() }));
    setDesignIdeas((prev) => {
      const remaining = (prev[templateId] || []).filter((idea) => !selected.includes(idea));
      return { ...prev, [templateId]: remaining };
    });
    
    queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
    setGeneratingFromIdeas(null);
    setIdeaProgress(null);
    toast.success(`Generated ${successCount} of ${selected.length} designs!`);
  };

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateFormData) => {
      let coverUrl = generatedCoverUrl || editingTemplate?.cover_image_url;

      if (templateImageFile) {
        setTemplateUploading(true);
        const compressed = await compressImage(templateImageFile);
        const fileName = `${Date.now()}-${templateImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`card-templates/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`card-templates/${fileName}`);
        coverUrl = urlData.publicUrl;
        setTemplateUploading(false);
      }

      if (!coverUrl) throw new Error("Cover image is required");

      const payload = { 
        ...data, 
        cover_image_url: coverUrl,
        coin_price: data.is_free ? 0 : data.coin_price,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("card_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("card_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
      toast.success(editingTemplate ? "Template updated!" : "Template created!");
      handleCloseTemplateDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving template", error);
      setTemplateUploading(false);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
      toast.success("Template deleted!");
    },
  });

  const toggleTemplateActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("card_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-templates"] });
    },
  });

  const handleCloseTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateFormData({ title: "", description: "", category: "general", coin_price: 0, is_free: true, display_order: 0 });
    setTemplateImageFile(null);
    setGeneratedCoverUrl(null);
    setCoverPrompt("");
  };

  const handleEditTemplate = (template: CardTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      title: template.title,
      description: template.description || "",
      category: template.category || "general",
      coin_price: template.coin_price || 0,
      is_free: template.is_free,
      display_order: template.display_order || 0,
    });
    setCoverPrompt(template.title);
    setTemplateImageFile(null);
    setGeneratedCoverUrl(null);
    setTemplateDialogOpen(true);
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    saveTemplateMutation.mutate(templateFormData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Card Packs
        </CardTitle>
        <Button onClick={() => setTemplateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Pack
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !templates?.length ? (
          <p className="text-muted-foreground">No card packs yet. Create your first pack above.</p>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {templates.map((template) => {
              const allDesigns = templateDesigns[template.id] || [];
              const archivedCount = allDesigns.filter(d => d.is_active === false).length;
              const designs = showArchived ? allDesigns : allDesigns.filter(d => d.is_active !== false);
              const missingCount = allDesigns.filter((d) => d.is_active !== false && !d.image_url).length;
              
              return (
                <AccordionItem key={template.id} value={template.id} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border flex-shrink-0">
                        {template.cover_image_url ? (
                          <img
                            src={template.cover_image_url}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageOff className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{template.title}</span>
                          {!template.is_active && (
                            <Badge variant="secondary" className="text-xs">Hidden</Badge>
                          )}
                          {template.is_free ? (
                            <Badge variant="outline" className="text-xs">Free</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs gap-1">
                              <Coins className="w-3 h-3" />
                              {template.coin_price}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {allDesigns.filter(d => d.is_active !== false).length} designs
                          {archivedCount > 0 && <span className="text-muted-foreground/70"> (+{archivedCount} archived)</span>}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pb-4">
                    {/* Cover Section */}
                    <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        🎴 Pack Cover
                      </h4>
                      <div className="flex items-start gap-4">
                        {template.cover_image_url ? (
                          <div className="relative group rounded-lg border-2 border-primary overflow-hidden w-24 h-32 flex-shrink-0">
                            <img
                              src={template.cover_image_url}
                              alt={`${template.title} Cover`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setPreviewImage({ url: template.cover_image_url, name: `${template.title} Cover` })}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage({ url: template.cover_image_url, name: `${template.title} Cover` });
                                }}
                                className="text-xs h-7"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateCover(template.id);
                                }}
                                disabled={generatingCover === template.id}
                                className="text-xs h-7"
                              >
                                {generatingCover === template.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regen
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 w-24 h-32 flex-shrink-0 flex items-center justify-center bg-muted">
                            <ImageOff className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.cover_image_url 
                              ? "Hover over the cover to regenerate it with a new design."
                              : "Generate a themed cover for this card pack."}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateCover(template.id)}
                            disabled={generatingCover === template.id}
                          >
                            {generatingCover === template.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-1" />
                                {template.cover_image_url ? "Regenerate Cover" : "Generate Cover"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Pack Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTemplateActiveMutation.mutate({ id: template.id, is_active: !template.is_active })}
                      >
                        {template.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Pack
                      </Button>
                      {missingCount === 0 && designs.length > 0 && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          All designs generated
                        </span>
                      )}
                    </div>

                    {/* Add New Design */}
                    <div className="space-y-3 mb-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter design name (e.g., Birthday Cake, Hearts...)"
                          value={activeTemplateId === template.id ? newDesignName : ""}
                          onChange={(e) => {
                            setActiveTemplateId(template.id);
                            setNewDesignName(e.target.value);
                          }}
                          onFocus={() => setActiveTemplateId(template.id)}
                          disabled={addingDesign || uploadingDesignFor === template.id}
                        />
                        <Button
                          onClick={() => handleAddDesign(template.id)}
                          disabled={!newDesignName.trim() || addingDesign || activeTemplateId !== template.id || uploadingDesignFor === template.id}
                        >
                          {addingDesign && activeTemplateId === template.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add & Generate
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Upload option */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadDesign(template.id, file, newDesignName);
                              }
                              e.target.value = '';
                            }}
                            disabled={uploadingDesignFor === template.id || addingDesign}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingDesignFor === template.id || addingDesign}
                          >
                            {uploadingDesignFor === template.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-1" />
                                Upload Image
                              </>
                            )}
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {newDesignName.trim() ? `Upload as "${newDesignName}"` : "Uses filename as name (or enter name above first)"}
                        </span>
                      </div>

                      {/* Idea Wand Section */}
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-primary" />
                            Design Ideas
                          </h5>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateIdeas(template)}
                            disabled={generatingIdeas === template.id || generatingFromIdeas === template.id}
                          >
                            {generatingIdeas === template.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-1" />
                                {designIdeas[template.id]?.length ? "Refresh Ideas" : "Generate Ideas"}
                              </>
                            )}
                          </Button>
                        </div>

                        {designIdeas[template.id]?.length > 0 && (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                {selectedIdeas[template.id]?.size || 0} of {designIdeas[template.id].length} selected
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAllIdeas(template.id, true)}
                                  className="text-xs h-7"
                                >
                                  Select All
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAllIdeas(template.id, false)}
                                  className="text-xs h-7"
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {designIdeas[template.id].map((idea) => {
                                const isSelected = selectedIdeas[template.id]?.has(idea);
                                return (
                                  <Badge
                                    key={idea}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected ? "" : "hover:bg-muted"
                                    }`}
                                    onClick={() => toggleIdeaSelection(template.id, idea)}
                                  >
                                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                                    {idea}
                                  </Badge>
                                );
                              })}
                            </div>

                            {ideaProgress && generatingFromIdeas === template.id && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Generating designs...</span>
                                  <span>{ideaProgress.current} / {ideaProgress.total}</span>
                                </div>
                                <Progress value={(ideaProgress.current / ideaProgress.total) * 100} />
                              </div>
                            )}

                            <Button
                              onClick={() => handleGenerateFromIdeas(template.id)}
                              disabled={
                                !selectedIdeas[template.id]?.size ||
                                generatingFromIdeas === template.id ||
                                generatingIdeas === template.id
                              }
                            >
                              {generatingFromIdeas === template.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Generating {ideaProgress?.current || 0}/{ideaProgress?.total || 0}...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Generate {selectedIdeas[template.id]?.size || 0} Selected Designs
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {!designIdeas[template.id]?.length && !generatingIdeas && (
                          <p className="text-xs text-muted-foreground">
                            Use AI to generate design ideas based on "{template.title}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Designs Filter & Grid */}
                    {archivedCount > 0 && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                          {designs.length} {showArchived ? 'total' : 'active'} designs
                          {!showArchived && archivedCount > 0 && ` (${archivedCount} archived)`}
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`show-archived-${template.id}`}
                            checked={showArchived}
                            onCheckedChange={setShowArchived}
                          />
                          <Label htmlFor={`show-archived-${template.id}`} className="text-sm cursor-pointer">
                            Show archived
                          </Label>
                        </div>
                      </div>
                    )}

                    {designs.length === 0 && !showArchived && archivedCount > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>All {archivedCount} designs are archived.</p>
                        <Button
                          variant="link"
                          onClick={() => setShowArchived(true)}
                          className="mt-2"
                        >
                          Show archived designs
                        </Button>
                      </div>
                    ) : designs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No designs yet. Add your first card design above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {designs.map((design) => (
                          <div
                            key={design.id}
                            className={`relative group rounded-lg border-2 overflow-hidden aspect-square ${
                              design.is_active === false 
                                ? "border-muted opacity-50" 
                                : "border-border"
                            }`}
                          >
                            {design.is_active === false && (
                              <div className="absolute top-1 left-1 z-10">
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archived
                                </Badge>
                              </div>
                            )}
                            {design.image_url ? (
                              <img
                                src={design.image_url}
                                alt={design.title}
                                className="w-full h-full object-cover cursor-pointer bg-white"
                                loading="lazy"
                                onClick={() => setPreviewImage({ url: design.image_url, name: design.title })}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageOff className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                              <span className="text-xs text-white font-medium">{design.title}</span>
                            </div>

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                              {design.image_url && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setPreviewImage({ url: design.image_url, name: design.title })}
                                  className="text-xs h-7"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingDesign(design);
                                  setEditDesignName(design.title);
                                }}
                                className="text-xs h-7"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit Name
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRegenerateDesign(design)}
                                disabled={regeneratingId === design.id}
                                className="text-xs h-7"
                              >
                                {regeneratingId === design.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regen
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant={design.is_active === false ? "secondary" : "outline"}
                                onClick={() => handleToggleDesignActive(design)}
                                className="text-xs h-7"
                              >
                                {design.is_active === false ? (
                                  <>
                                    <ArchiveRestore className="w-3 h-3 mr-1" />
                                    Restore
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3 h-3 mr-1" />
                                    Archive
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => !open && handleCloseTemplateDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit" : "Add"} Card Pack</DialogTitle>
            <DialogDescription>
              Create a new card pack with designs that users can color.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTemplate} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={templateFormData.title}
                onChange={(e) => {
                  setTemplateFormData({ ...templateFormData, title: e.target.value });
                  setCoverPrompt(e.target.value);
                }}
                placeholder="e.g., Birthday Cards"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !templateFormData.title.trim()}
                  className="h-7 px-2 text-xs gap-1"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                placeholder="What's this card pack about?"
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Free Pack
                </Label>
                <Switch
                  checked={templateFormData.is_free}
                  onCheckedChange={(checked) => setTemplateFormData({ ...templateFormData, is_free: checked })}
                />
              </div>
              {!templateFormData.is_free && (
                <div>
                  <Label>Price (coins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={templateFormData.coin_price}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, coin_price: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={templateFormData.display_order}
                onChange={(e) => setTemplateFormData({ ...templateFormData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* AI Cover Generation */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Generate Cover with AI
              </Label>
              <div className="flex gap-2">
                <Input
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  placeholder="e.g., Birthday celebration cards"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateCover()}
                  disabled={generatingCover === "new" || !coverPrompt.trim()}
                  variant="secondary"
                >
                  {generatingCover === "new" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {generatedCoverUrl && (
                <div className="relative">
                  <img 
                    src={generatedCoverUrl} 
                    alt="Generated" 
                    className="w-full max-w-xs mx-auto rounded border"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">AI Generated Cover</p>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload</span>
              </div>
            </div>

            {editingTemplate?.cover_image_url && !templateImageFile && !generatedCoverUrl && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm text-muted-foreground mb-2 block">Current Cover</Label>
                <img 
                  src={editingTemplate.cover_image_url} 
                  alt="Current cover" 
                  className="w-full max-w-xs mx-auto rounded border"
                />
              </div>
            )}

            <div>
              <Label>Upload Cover Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setTemplateImageFile(e.target.files?.[0] || null);
                  if (e.target.files?.[0]) setGeneratedCoverUrl(null);
                }}
              />
              {templateImageFile && (
                <img 
                  src={URL.createObjectURL(templateImageFile)} 
                  alt="Preview" 
                  className="mt-2 w-32 h-40 object-cover rounded"
                />
              )}
            </div>

            <Button type="submit" disabled={saveTemplateMutation.isPending || templateUploading || generatingCover === "new"} className="w-full">
              {templateUploading ? "Uploading..." : saveTemplateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img 
              src={previewImage.url} 
              alt={previewImage.name} 
              className="w-full rounded-lg bg-white"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Design Name Dialog */}
      <Dialog open={!!editingDesign} onOpenChange={() => { setEditingDesign(null); setEditDesignName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Design Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editDesignName}
                onChange={(e) => setEditDesignName(e.target.value)}
                placeholder="Design name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditingDesign(null); setEditDesignName(""); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => editingDesign && handleUpdateDesignName(editingDesign, editDesignName)}
                disabled={!editDesignName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
