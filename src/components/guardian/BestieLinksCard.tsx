import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link as LinkIcon, Trash2, Star, Edit, Settings, MessageSquare, ShoppingBag, FileCheck, Store } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { cn } from "@/lib/utils";

interface BestieLink {
  id: string;
  bestie_id: string;
  relationship: string;
  created_at: string;
  require_post_approval: boolean;
  require_comment_approval: boolean;
  require_prayer_approval: boolean;
  allow_featured_posts: boolean;
  require_vendor_asset_approval: boolean;
  show_vendor_link_on_bestie: boolean;
  show_vendor_link_on_guardian: boolean;
  allow_sponsor_messages: boolean;
  require_message_approval: boolean;
  bestie: {
    display_name: string;
    avatar_number: number;
  };
}

interface VendorLink {
  id: string;
  vendor_id: string;
  bestie_id: string;
  status: string;
  vendor: {
    business_name: string;
  };
}

interface BestieLinksCardProps {
  link: BestieLink;
  vendorLinks: Map<string, VendorLink[]>;
  bestiesInSponsorProgram: Set<string>;
  userRole: string;
  onUpdateLink: (linkId: string, field: string, value: boolean) => void;
  onRemoveLink: (linkId: string) => void;
  onManageFeatured: (bestieId: string, bestieName: string) => void;
}

export function BestieLinksCard({
  link,
  vendorLinks,
  bestiesInSponsorProgram,
  userRole,
  onUpdateLink,
  onRemoveLink,
  onManageFeatured,
}: BestieLinksCardProps) {
  const isAdmin = userRole === "admin" || userRole === "owner";
  const bestieVendorLinks = vendorLinks.get(link.bestie_id) || [];
  const isInSponsorProgram = bestiesInSponsorProgram.has(link.bestie_id);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarDisplay displayName={link.bestie.display_name} size="md" />
            <div>
              <CardTitle className="text-lg">{link.bestie.display_name}</CardTitle>
              <CardDescription className="capitalize">{link.relationship}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageFeatured(link.bestie_id, link.bestie.display_name)}
            >
              <Star className="w-4 h-4 mr-2" />
              Featured
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Link</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove your link to {link.bestie.display_name}? 
                    This will remove your guardian access to their content.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemoveLink(link.id)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="w-full">
          {/* Content Moderation Section */}
          <AccordionItem value="content-moderation">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Content Moderation
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`post-approval-${link.id}`} className="flex-1">
                    Require post approval
                  </Label>
                  <Switch
                    id={`post-approval-${link.id}`}
                    checked={link.require_post_approval}
                    onCheckedChange={(checked) => onUpdateLink(link.id, "require_post_approval", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`comment-approval-${link.id}`} className="flex-1">
                    Require comment approval
                  </Label>
                  <Switch
                    id={`comment-approval-${link.id}`}
                    checked={link.require_comment_approval}
                    onCheckedChange={(checked) => onUpdateLink(link.id, "require_comment_approval", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`prayer-approval-${link.id}`} className="flex-1">
                    Require prayer request approval
                  </Label>
                  <Switch
                    id={`prayer-approval-${link.id}`}
                    checked={link.require_prayer_approval}
                    onCheckedChange={(checked) => onUpdateLink(link.id, "require_prayer_approval", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`featured-posts-${link.id}`} className="flex-1">
                    Allow featured posts
                  </Label>
                  <Switch
                    id={`featured-posts-${link.id}`}
                    checked={link.allow_featured_posts}
                    onCheckedChange={(checked) => onUpdateLink(link.id, "allow_featured_posts", checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Vendor Relationships Section - Admin Only */}
          {isAdmin && (
            <AccordionItem value="vendor-relationships">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Vendor Relationships
                  <Badge variant="secondary" className="ml-2 text-xs">Admin Only</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`vendor-approval-${link.id}`} className="flex-1">
                      Require vendor asset approval
                    </Label>
                    <Switch
                      id={`vendor-approval-${link.id}`}
                      checked={link.require_vendor_asset_approval}
                      onCheckedChange={(checked) => onUpdateLink(link.id, "require_vendor_asset_approval", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`vendor-link-bestie-${link.id}`} className="flex-1">
                      Show vendor link on bestie profile
                    </Label>
                    <Switch
                      id={`vendor-link-bestie-${link.id}`}
                      checked={link.show_vendor_link_on_bestie}
                      onCheckedChange={(checked) => onUpdateLink(link.id, "show_vendor_link_on_bestie", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`vendor-link-guardian-${link.id}`} className="flex-1">
                      Show vendor link on guardian profile
                    </Label>
                    <Switch
                      id={`vendor-link-guardian-${link.id}`}
                      checked={link.show_vendor_link_on_guardian}
                      onCheckedChange={(checked) => onUpdateLink(link.id, "show_vendor_link_on_guardian", checked)}
                    />
                  </div>
                  {bestieVendorLinks.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Linked Vendors:</p>
                      <div className="flex flex-wrap gap-2">
                        {bestieVendorLinks.map((vl) => (
                          <Badge key={vl.id} variant="outline">
                            {vl.vendor.business_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Sponsor Communication Section - Only if in sponsor program */}
          {isInSponsorProgram && (
            <AccordionItem value="sponsor-communication">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Sponsor Communication
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`sponsor-messages-${link.id}`} className="flex-1">
                      Allow sponsor messages
                    </Label>
                    <Switch
                      id={`sponsor-messages-${link.id}`}
                      checked={link.allow_sponsor_messages}
                      onCheckedChange={(checked) => onUpdateLink(link.id, "allow_sponsor_messages", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`message-approval-${link.id}`} className="flex-1">
                      Require message approval
                    </Label>
                    <Switch
                      id={`message-approval-${link.id}`}
                      checked={link.require_message_approval}
                      onCheckedChange={(checked) => onUpdateLink(link.id, "require_message_approval", checked)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
