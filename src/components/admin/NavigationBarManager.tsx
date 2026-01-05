import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Eye, EyeOff, ChevronRight, ChevronDown } from "lucide-react";
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
  link_type: 'regular' | 'dropdown';
  parent_id?: string | null;
}

function SortableLink({
  link,
  onUpdate,
  onDelete,
  onAddChild,
  onToggleCollapse,
  isCollapsed,
  hasChildren,
  children,
  level = 0,
}: {
  link: NavigationLink;
  onUpdate: (id: string, updates: Partial<NavigationLink>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onToggleCollapse?: (id: string) => void;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  children?: React.ReactNode;
  level?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const [isCustomUrl, setIsCustomUrl] = useState(!INTERNAL_PAGES.some((p) => p.value === link.href));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: level > 0 ? `${level * 2}rem` : undefined,
  };

  return (
    <div className="space-y-2">
      <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {level === 0 && link.link_type === 'dropdown' && hasChildren && (
          <button 
            onClick={() => onToggleCollapse?.(link.id)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={isCollapsed ? "Expand children" : "Collapse children"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}

        {level > 0 && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}

        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={link.label}
              onChange={(e) => onUpdate(link.id, { label: e.target.value })}
              placeholder="Link text"
            />
          </div>

          {level === 0 && (
            <div>
              <Label className="text-xs">Link Type</Label>
              <Select
                value={link.link_type}
                onValueChange={(value: 'regular' | 'dropdown') => {
                  onUpdate(link.id, { link_type: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Link</SelectItem>
                  <SelectItem value="dropdown">Dropdown Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={level === 0 ? "" : "col-span-2"}>
            <Label className="text-xs">URL Type</Label>
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
            <Label className="text-xs">
              {isCustomUrl ? "Custom URL" : "Page"}
              {link.link_type === 'dropdown' && " (optional - parent can be clickable)"}
            </Label>
            {isCustomUrl ? (
              <Input
                value={link.href}
                onChange={(e) => onUpdate(link.id, { href: e.target.value })}
                placeholder={link.link_type === 'dropdown' ? "https://example.com (optional)" : "https://example.com"}
              />
            ) : (
              <Select 
                value={link.href || "none"} 
                onValueChange={(value) => onUpdate(link.id, { href: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={link.link_type === 'dropdown' ? "None (optional)" : "Select page"} />
                </SelectTrigger>
                <SelectContent>
                  {link.link_type === 'dropdown' && (
                    <SelectItem value="none">None (just dropdown)</SelectItem>
                  )}
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
          {link.link_type === 'dropdown' && level === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAddChild(link.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Child
            </Button>
          )}
          
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
      {children}
    </div>
  );
}

export function NavigationBarManager() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("navigation_links")
        .select("id, label, href, display_order, is_active, visible_to_roles, link_type, parent_id");

      if (error) throw error;
      
      // Sort links properly: top-level by display_order, then children by display_order
      const sorted = (data || []).sort((a, b) => {
        // If one has no parent and the other does, parent comes first
        if (!a.parent_id && b.parent_id) return -1;
        if (a.parent_id && !b.parent_id) return 1;
        
        // If both have no parent or both have the same parent, sort by display_order
        if (a.parent_id === b.parent_id) {
          return a.display_order - b.display_order;
        }
        
        // Otherwise maintain original order
        return 0;
      });
      
      setLinks(sorted as NavigationLink[]);
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
      display_order: links.filter(l => !l.parent_id).length,
      is_active: true,
      visible_to_roles: USER_ROLES.map(r => r.value),
      link_type: 'regular',
      parent_id: null,
    };
    setLinks([...links, newLink]);
  };

  const handleAddChild = (parentId: string) => {
    const parent = links.find(l => l.id === parentId);
    if (!parent) return;

    const childrenCount = links.filter(l => l.parent_id === parentId).length;
    const newChild: NavigationLink = {
      id: `temp-${Date.now()}`,
      label: "New Child Link",
      href: "/",
      display_order: childrenCount,
      is_active: true,
      visible_to_roles: parent.visible_to_roles || USER_ROLES.map(r => r.value),
      link_type: 'regular',
      parent_id: parentId,
    };
    setLinks([...links, newChild]);
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
      // Also remove any children of this link
      setLinks(links.filter((link) => link.id !== id && link.parent_id !== id));
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

  const handleToggleCollapse = (parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLinks((items) => {
        // Only reorder items at the same level
        const activeItem = items.find(item => item.id === active.id);
        const overItem = items.find(item => item.id === over.id);
        
        if (!activeItem || !overItem || activeItem.parent_id !== overItem.parent_id) {
          return items;
        }

        const sameLevel = items.filter(item => item.parent_id === activeItem.parent_id);
        const otherItems = items.filter(item => item.parent_id !== activeItem.parent_id);
        
        const oldIndex = sameLevel.findIndex((item) => item.id === active.id);
        const newIndex = sameLevel.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(sameLevel, oldIndex, newIndex);
        const reorderedWithOrder: NavigationLink[] = reordered.map((item, index) => ({ ...item, display_order: index }));
        
        return [...otherItems, ...reorderedWithOrder].sort((a, b) => {
          if (a.parent_id !== b.parent_id) return 0;
          return a.display_order - b.display_order;
        });
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
        // Only validate href for regular links or dropdown links with a href
        if (link.link_type === 'regular' || (link.link_type === 'dropdown' && link.href && link.href.trim() !== '')) {
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
      }

      // Separate parent links (no parent_id) and child links (have parent_id)
      const parentLinks = links.filter(l => !l.parent_id);
      const childLinks = links.filter(l => l.parent_id);
      
      // Map to track temp IDs to real IDs
      const tempIdToRealId: Record<string, string> = {};
      
      // First, save all parent links
      const parentResults = await Promise.all(
        parentLinks.map(async (link) => {
          const isNew = link.id.startsWith("temp-");
          
          const linkData = {
            label: link.label.trim(),
            href: (link.href && link.href.trim()) || '',
            display_order: link.display_order,
            is_active: link.is_active,
            visible_to_roles: link.visible_to_roles || USER_ROLES.map(r => r.value),
            link_type: link.link_type,
            parent_id: null,
          };
          
          if (isNew) {
            const { data, error } = await supabase.from("navigation_links").insert([{
              ...linkData,
              created_by: userData.user.id,
            }]).select('id').single();
            
            if (data) {
              tempIdToRealId[link.id] = data.id;
            }
            return { error, type: 'insert', link };
          } else {
            const { error } = await supabase.from("navigation_links").update(linkData).eq("id", link.id);
            return { error, type: 'update', link };
          }
        })
      );
      
      // Check for parent errors before proceeding
      const parentErrors = parentResults.filter(r => r.error);
      if (parentErrors.length > 0) {
        console.error("Parent save errors:", parentErrors);
        throw new Error(`Failed to save ${parentErrors.length} parent link(s): ${parentErrors[0].error.message}`);
      }
      
      // Now save all child links, mapping temp parent IDs to real IDs
      const childResults = await Promise.all(
        childLinks.map(async (link) => {
          const isNew = link.id.startsWith("temp-");
          
          // Resolve the parent_id - if it was a temp ID, use the real ID
          let resolvedParentId = link.parent_id;
          if (resolvedParentId && resolvedParentId.startsWith("temp-")) {
            resolvedParentId = tempIdToRealId[resolvedParentId] || null;
          }
          
          const linkData = {
            label: link.label.trim(),
            href: (link.href && link.href.trim()) || '',
            display_order: link.display_order,
            is_active: link.is_active,
            visible_to_roles: link.visible_to_roles || USER_ROLES.map(r => r.value),
            link_type: link.link_type,
            parent_id: resolvedParentId,
          };
          
          if (isNew) {
            const { error } = await supabase.from("navigation_links").insert([{
              ...linkData,
              created_by: userData.user.id,
            }]);
            return { error, type: 'insert', link };
          } else {
            const { error } = await supabase.from("navigation_links").update(linkData).eq("id", link.id);
            return { error, type: 'update', link };
          }
        })
      );
      
      const results = [...parentResults, ...childResults];

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error("Save errors:", errors);
        throw new Error(`Failed to save ${errors.length} link(s): ${errors[0].error.message}`);
      }

      toast({
        title: "Navigation saved",
        description: "Navigation bar has been updated successfully",
      });

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

  const renderLinks = () => {
    const topLevelLinks = links.filter(l => !l.parent_id);
    
    return topLevelLinks.map((link) => {
      const children = links.filter(l => l.parent_id === link.id);
      const isCollapsed = collapsedParents.has(link.id);
      
      return (
        <SortableLink
          key={link.id}
          link={link}
          onUpdate={handleUpdateLink}
          onDelete={handleDeleteLink}
          onAddChild={handleAddChild}
          onToggleCollapse={handleToggleCollapse}
          isCollapsed={isCollapsed}
          hasChildren={children.length > 0}
          level={0}
        >
          {children.length > 0 && !isCollapsed && (
            <div className="space-y-2 mt-2">
              {children.map((child) => (
                <SortableLink
                  key={child.id}
                  link={child}
                  onUpdate={handleUpdateLink}
                  onDelete={handleDeleteLink}
                  onAddChild={handleAddChild}
                  level={1}
                />
              ))}
            </div>
          )}
        </SortableLink>
      );
    });
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
              {renderLinks()}
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