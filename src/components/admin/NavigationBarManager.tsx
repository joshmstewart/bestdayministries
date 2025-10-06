import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { navigationLinkSchema, validateInput, sanitizeUrl } from "@/lib/validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { INTERNAL_PAGES } from "@/lib/internalPages";
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];

const USER_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'supporter', label: 'Supporter' },
  { value: 'bestie', label: 'Bestie' },
  { value: 'caregiver', label: 'Guardian' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'vendor', label: 'Vendor' },
];

interface NavigationLink {
  id: string;
  label: string;
  href: string;
  display_order: number;
  is_active: boolean;
  visible_to_roles?: UserRole[];
}

function SortableLink({
  link,
  onUpdate,
  onDelete,
}: {
  link: NavigationLink;
  onUpdate: (id: string, updates: Partial<NavigationLink>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const [isCustomUrl, setIsCustomUrl] = useState(!INTERNAL_PAGES.some((p) => p.value === link.href));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            value={link.label}
            onChange={(e) => onUpdate(link.id, { label: e.target.value })}
            placeholder="Link text"
          />
        </div>

        <div>
          <Label className="text-xs">Link Type</Label>
          <Select
            value={isCustomUrl ? "custom" : "internal"}
            onValueChange={(value) => {
              setIsCustomUrl(value === "custom");
              if (value === "internal") {
                onUpdate(link.id, { href: "/" });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal Page</SelectItem>
              <SelectItem value="custom">Custom URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label className="text-xs">{isCustomUrl ? "Custom URL" : "Page"}</Label>
          {isCustomUrl ? (
            <Input
              value={link.href}
              onChange={(e) => onUpdate(link.id, { href: e.target.value })}
              placeholder="https://example.com"
            />
          ) : (
            <Select value={link.href} onValueChange={(value) => onUpdate(link.id, { href: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_PAGES.map((page) => (
                  <SelectItem key={page.value} value={page.value}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="col-span-2">
          <Label className="text-xs">Visible to Roles</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {USER_ROLES.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${link.id}-${role.value}`}
                  checked={link.visible_to_roles?.includes(role.value) ?? true}
                  onCheckedChange={(checked) => {
                    const currentRoles = link.visible_to_roles || USER_ROLES.map(r => r.value);
                    const newRoles = checked
                      ? [...currentRoles, role.value]
                      : currentRoles.filter(r => r !== role.value);
                    onUpdate(link.id, { visible_to_roles: newRoles });
                  }}
                />
                <label
                  htmlFor={`${link.id}-${role.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {role.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={link.is_active}
            onCheckedChange={(checked) => onUpdate(link.id, { is_active: checked })}
          />
          <div className={`p-1.5 rounded ${link.is_active ? "bg-green-100" : "bg-red-100"}`}>
            {link.is_active ? (
              <Eye className="h-4 w-4 text-green-700" />
            ) : (
              <EyeOff className="h-4 w-4 text-red-700" />
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(link.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function NavigationBarManager() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("navigation_links")
        .select("id, label, href, display_order, is_active, visible_to_roles")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading links",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLink = () => {
    const newLink: NavigationLink = {
      id: `temp-${Date.now()}`,
      label: "New Link",
      href: "/",
      display_order: links.length,
      is_active: true,
      visible_to_roles: USER_ROLES.map(r => r.value),
    };
    setLinks([...links, newLink]);
  };

  const handleUpdateLink = (id: string, updates: Partial<NavigationLink>) => {
    setLinks(links.map((link) => (link.id === id ? { ...link, ...updates } : link)));
  };

  const handleDeleteLink = async (id: string) => {
    try {
      if (!id.startsWith("temp-")) {
        const { error } = await supabase.from("navigation_links").delete().eq("id", id);
        if (error) throw error;
      }
      setLinks(links.filter((link) => link.id !== id));
      toast({
        title: "Link deleted",
        description: "Navigation link has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLinks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, display_order: index }));
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Validate all links before saving
      for (const link of links) {
        const validation = validateInput(navigationLinkSchema, {
          label: link.label,
          href: link.href,
          display_order: link.display_order,
          is_active: link.is_active,
        });
        
        if (!validation.success) {
          toast({
            title: "Validation Error",
            description: validation.errors?.[0] || "Invalid link data",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Additional URL sanitization check
        try {
          sanitizeUrl(link.href);
        } catch (error: any) {
          toast({
            title: "Invalid URL",
            description: `${link.label}: ${error.message}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Separate existing links from new links
      const results = await Promise.all(
        links.map(async (link) => {
          const isNew = link.id.startsWith("temp-");
          
          if (isNew) {
            // For new links, don't include id field at all
            const { error } = await supabase.from("navigation_links").insert([{
              label: link.label.trim(),
              href: link.href.trim(),
              display_order: link.display_order,
              is_active: link.is_active,
              visible_to_roles: link.visible_to_roles || USER_ROLES.map(r => r.value),
              created_by: userData.user.id,
            }]);
            return { error, type: 'insert', link };
          } else {
            // For existing links, include id for update
            const { error } = await supabase.from("navigation_links").update({
              label: link.label.trim(),
              href: link.href.trim(),
              display_order: link.display_order,
              is_active: link.is_active,
              visible_to_roles: link.visible_to_roles || USER_ROLES.map(r => r.value),
            }).eq("id", link.id);
            return { error, type: 'update', link };
          }
        })
      );

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error("Save errors:", errors);
        throw new Error(`Failed to save ${errors.length} link(s): ${errors[0].error.message}`);
      }

      toast({
        title: "Navigation saved",
        description: "Navigation bar has been updated successfully",
      });

      // Reload to get proper IDs
      await loadLinks();
    } catch (error: any) {
      toast({
        title: "Error saving navigation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Bar Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {links.map((link) => (
                <SortableLink
                  key={link.id}
                  link={link}
                  onUpdate={handleUpdateLink}
                  onDelete={handleDeleteLink}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <Button onClick={handleAddLink} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
