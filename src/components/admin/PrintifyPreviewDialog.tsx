import { useState, useEffect, type PropsWithChildren } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DollarSign, Plus, RefreshCw, AlertTriangle, Check } from "lucide-react";

interface PrintifyVariant {
  id: number;
  title: string;
  price: number;
  is_enabled: boolean;
}

interface PrintifyImage {
  src: string;
  variant_ids?: number[];
  position?: string;
  is_default?: boolean;
}

interface LocalValues {
  title: string;
  description: string;
  price: number;
  original_title?: string;
  original_description?: string;
  original_price?: number;
}

interface PrintifyValues {
  title: string;
  description: string;
  price: number;
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  images: PrintifyImage[];
  variants: PrintifyVariant[];
  options?: { name: string; values: string[] }[];
  is_imported: boolean;
  has_changes?: boolean;
  visible: boolean;
  local_values?: LocalValues | null;
  printify_values?: PrintifyValues;
}

interface PrintifyPreviewDialogProps {
  product: PrintifyProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (product: PrintifyProduct, priceMarkup: number, editedTitle: string, editedDescription: string, defaultImageIndex?: number) => void;
  onSync?: (product: PrintifyProduct) => void;
  onDismissUpdates?: (product: PrintifyProduct, currentTitle: string, currentDescription: string) => void;
  isImporting: boolean;
}

// Extract unique options from variant titles if options array not available
const extractOptionsFromVariants = (variants: PrintifyVariant[]): { name: string; values: string[] }[] => {
  const enabledVariants = variants.filter(v => v.is_enabled);
  if (enabledVariants.length === 0) return [];

  // Parse variant titles like "Natural / XS" or "Black / L"
  const firstVariant = enabledVariants[0].title;
  const parts = firstVariant.split(' / ');
  
  if (parts.length === 1) {
    // Single option (e.g., just size)
    const values = [...new Set(enabledVariants.map(v => v.title))];
    return [{ name: 'Option', values }];
  }

  // Multiple options - determine which position is which
  const optionValues: string[][] = parts.map(() => new Set<string>()) as any;
  
  enabledVariants.forEach(v => {
    const variantParts = v.title.split(' / ');
    variantParts.forEach((part, idx) => {
      if (optionValues[idx]) {
        (optionValues[idx] as unknown as Set<string>).add(part);
      }
    });
  });

  // Convert sets to arrays and guess option names
  return optionValues.map((valuesSet, idx) => {
    const values = [...(valuesSet as unknown as Set<string>)];
    // Try to guess the option name based on values
    const sizeKeywords = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'];
    const isSize = values.some(v => sizeKeywords.includes(v.toLowerCase()));
    const name = isSize ? 'Size' : (idx === 0 ? 'Color' : `Option ${idx + 1}`);
    return { name, values };
  });
};

type OptionChipProps = PropsWithChildren<{
  selected: boolean;
  isColor?: boolean;
  onSelect: () => void;
}>;

const OptionChip = ({ selected, isColor, onSelect, children }: OptionChipProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={(e) => {
      e.preventDefault();
      onSelect();
    }}
    className={cn(
      badgeVariants({ variant: selected ? "default" : "secondary" }),
      "text-xs cursor-pointer transition-all hover:ring-2 hover:ring-ring/50",
      isColor ? "hover:scale-[1.02]" : ""
    )}
  >
    {children}
  </button>
);

export const PrintifyPreviewDialog = ({
  product,
  open,
  onOpenChange,
  onImport,
  onSync,
  onDismissUpdates,
  isImporting,
}: PrintifyPreviewDialogProps) => {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [priceMarkup, setPriceMarkup] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [defaultImageIndex, setDefaultImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Initialize state when product changes or dialog opens
  useEffect(() => {
    if (open && product) {
      setEditedTitle(product.title || "");
      setEditedDescription(product.description || "");
      setPriceMarkup(0);
      setSelectedImageIndex(0);
      setDefaultImageIndex(0);
      setSelectedOptions({});
    }
  }, [open, product]);

  if (!product) return null;

  const enabledVariants = product.variants.filter(v => v.is_enabled);
  const basePrice = enabledVariants[0]?.price || product.variants[0]?.price || 0;
  const finalPrice = basePrice + priceMarkup;

  // Debug: log product options and variants
  console.log('Product options from API:', product.options);
  console.log('Enabled variants:', enabledVariants.map(v => v.title));

  // Helper: extract base color name from variants like "Heather Prism Lilac" -> "Lilac"
  const getBaseColorName = (colorName: string): string => {
    const lower = colorName.toLowerCase().trim();
    // List of prefixes/modifiers to strip
    const prefixes = ['heather', 'prism', 'sport', 'athletic', 'vintage', 'dark', 'light', 'neon', 'pastel'];
    let words = lower.split(/\s+/);
    // Remove prefix words
    while (words.length > 1 && prefixes.includes(words[0])) {
      words.shift();
    }
    // Return the remaining word(s) with proper casing
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const isColorOptionName = (name: string): boolean => {
    const n = name.toLowerCase().trim();
    // Printify sometimes uses "Color" vs "Colors" (and "Colour/Colours")
    return n === 'color' || n === 'colors' || n === 'colour' || n === 'colours' ||
      n.startsWith('color') || n.startsWith('colour');
  };

  // Use product options if available, otherwise extract from variant titles
  const options = product.options && product.options.length > 0
    ? product.options.map(opt => {
        const isColorOption = isColorOptionName(opt.name);
        let values = opt.values
          // Normalize to strings first (Printify API can return objects like {id, title})
          .map(v => typeof v === 'string' ? v : (v as any)?.title || String(v))
          // Only include values that appear in enabled variants
          // Use exact matching by splitting variant title on " / " and comparing each part
          .filter(valueStr => 
            enabledVariants.some(variant => {
              const variantParts = variant.title.split(' / ').map(p => p.toLowerCase().trim());
              return variantParts.includes(valueStr.toLowerCase().trim());
            })
          );
        
        // For color options, normalize to base color names and deduplicate
        if (isColorOption) {
          const baseColorMap = new Map<string, string>();
          values.forEach(v => {
            const baseColor = getBaseColorName(v);
            // Keep the first (usually simplest) name for each base color
            if (!baseColorMap.has(baseColor.toLowerCase())) {
              baseColorMap.set(baseColor.toLowerCase(), baseColor);
            }
          });
          values = Array.from(baseColorMap.values());
        }
        
        return { name: opt.name, values };
      }).filter(opt => opt.values.length > 0)
    : extractOptionsFromVariants(product.variants);

  console.log('Computed options:', options);

  // Find the "Color" option index (usually first, but check by name)
  const colorOptionIndex = options.findIndex(opt => isColorOptionName(opt.name));

  // Helper: extract color keywords for fuzzy matching
  const getColorKeywords = (colorName: string): string[] => {
    const lower = colorName.toLowerCase();
    const words = lower.split(/[\s\-_]+/).filter(w => w.length > 2);
    // Common color mappings for fuzzy matching
    const colorMap: Record<string, string[]> = {
      'grey': ['gray', 'grey'],
      'gray': ['gray', 'grey'],
      'light pink': ['pink', 'lightpink', 'light-pink'],
      'light blue': ['blue', 'lightblue', 'light-blue'],
      'sport grey': ['grey', 'gray', 'sportgrey', 'sport-grey'],
      'sport gray': ['grey', 'gray', 'sportgray', 'sport-gray'],
      'ash': ['ash', 'grey', 'gray'],
      'sand': ['sand', 'beige', 'tan'],
      'natural': ['natural', 'cream', 'beige'],
      'heather': ['heather'],
    };
    
    // Add the full name, slug versions, and individual words
    const keywords = [
      lower,
      lower.replace(/\s+/g, ''),
      lower.replace(/\s+/g, '-'),
      lower.replace(/\s+/g, '_'),
      ...words
    ];
    
    // Add mapped variations
    Object.entries(colorMap).forEach(([key, values]) => {
      if (lower.includes(key)) {
        keywords.push(...values);
      }
    });
    
    return [...new Set(keywords)];
  };

  // Build a map of colors to their first matching image index
  const colorToImageIndex: Record<string, number> = {};
  if (colorOptionIndex !== -1) {
    const colorOption = options[colorOptionIndex];
    colorOption.values.forEach((colorName, colorIdx) => {
      const keywords = getColorKeywords(colorName);
      
      // Find variants that match this color (fuzzy)
      const matchingVariants = enabledVariants.filter(v => {
        const titleLower = v.title.toLowerCase();
        return keywords.some(kw => titleLower.includes(kw));
      });
      
      // Strategy 1: Find image by variant_ids
      let foundIndex = -1;
      if (matchingVariants.length > 0) {
        foundIndex = product.images.findIndex(img => 
          img.variant_ids && img.variant_ids.some(vid => 
            matchingVariants.some(v => v.id === vid)
          )
        );
      }
      
      // Strategy 2: Fuzzy match image URL with color keywords
      if (foundIndex === -1) {
        foundIndex = product.images.findIndex(img => {
          const urlLower = img.src.toLowerCase();
          return keywords.some(kw => urlLower.includes(kw));
        });
      }
      
      // Strategy 3: Match by position (first color = first image, etc.)
      if (foundIndex === -1 && colorIdx < product.images.length) {
        foundIndex = colorIdx;
      }
      
      if (foundIndex !== -1) {
        colorToImageIndex[colorName] = foundIndex;
      }
    });
  }

  console.log('Color to image mapping:', colorToImageIndex);

  // Handle option selection and auto-select matching image
  const handleOptionSelect = (optionName: string, value: string) => {
    const newSelected = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newSelected);
    
    // If selecting a color, try to find a matching image
    if (isColorOptionName(optionName)) {
      const mappedIndex = colorToImageIndex[value];
      if (mappedIndex !== undefined) {
        setSelectedImageIndex(mappedIndex);
      } else {
        // Last resort: use color position
        const colorOption = options.find(opt => isColorOptionName(opt.name));
        if (colorOption) {
          const colorIdx = colorOption.values.indexOf(value);
          if (colorIdx !== -1 && colorIdx < product.images.length) {
            setSelectedImageIndex(colorIdx);
          }
        }
      }
    }
  };

  const handleSubmit = () => {
    onImport(product, priceMarkup, editedTitle, editedDescription, defaultImageIndex);
  };

  const handleSync = () => {
    if (onSync) {
      onSync(product);
    }
  };

  const handleDismiss = () => {
    if (onDismissUpdates) {
      onDismissUpdates(product, editedTitle, editedDescription);
    }
  };

  // Calculate what changed for the comparison display
  const getChanges = () => {
    if (!product.has_changes || !product.local_values || !product.printify_values) {
      return [];
    }
    
    const changes: { field: string; before: string; after: string }[] = [];
    const local = product.local_values;
    const printify = product.printify_values;
    
    // Compare original Printify values (what we imported) vs current Printify values (what's new)
    const originalTitle = local.original_title || local.title;
    const originalDescription = local.original_description || local.description;
    const originalPrice = local.original_price ?? local.price;
    
    if (originalTitle !== printify.title) {
      changes.push({ field: 'Title', before: originalTitle, after: printify.title });
    }
    if (originalDescription !== printify.description) {
      changes.push({ 
        field: 'Description', 
        before: originalDescription.length > 100 ? originalDescription.substring(0, 100) + '...' : originalDescription,
        after: printify.description.length > 100 ? printify.description.substring(0, 100) + '...' : printify.description
      });
    }
    if (Math.abs(originalPrice - printify.price) > 0.01) {
      changes.push({ field: 'Base Price', before: `$${originalPrice.toFixed(2)}`, after: `$${printify.price.toFixed(2)}` });
    }
    
    return changes;
  };

  const changes = getChanges();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.is_imported ? "Update Product" : "Preview & Import"}
            {product.has_changes && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Has Updates
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {product.is_imported
              ? "This product has changes in Printify. Review and sync to update."
              : "Review and edit product details before importing to your store."}
          </DialogDescription>
        </DialogHeader>

        {/* Show changes comparison if there are updates */}
        {product.has_changes && changes.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Changes Detected in Printify
            </h4>
            <div className="space-y-2">
              {changes.map((change, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-muted-foreground">{change.field}:</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 ml-2">
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-xs line-through">
                      {change.before || '(empty)'}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs">
                      {change.after || '(empty)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {/* Images */}
            <div className="space-y-3">
              {product.images[selectedImageIndex] && (
                <div className="aspect-square bg-secondary/10 rounded-lg overflow-hidden">
                  <img
                    src={product.images[selectedImageIndex].src}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {product.images.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Click to preview, double-click to set as default
                    </p>
                    {defaultImageIndex > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Image {defaultImageIndex + 1} is default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        onDoubleClick={() => setDefaultImageIndex(idx)}
                        className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          idx === selectedImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                        title={idx === defaultImageIndex ? "Default image" : "Double-click to set as default"}
                      >
                        <img src={img.src} alt="" className="w-full h-full object-cover" />
                        {idx === defaultImageIndex && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary rounded-full p-0.5">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title</Label>
                <Input
                  id="title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Options organized by type - clickable */}
              <div className="space-y-3">
                <Label>Available Options ({enabledVariants.length} variants)</Label>
                {options.map((option, optIdx) => (
                  <div key={optIdx} className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">{option.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {option.values.map((value, valIdx) => {
                        const isSelected = selectedOptions[option.name] === value;
                        const isColor = option.name.toLowerCase() === "color" || option.name.toLowerCase() === "colour";
                        return (
                          <OptionChip
                            key={valIdx}
                            selected={isSelected}
                            isColor={isColor}
                            onSelect={() => handleOptionSelect(option.name, value)}
                          >
                            {value}
                          </OptionChip>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {colorOptionIndex !== -1 && (
                  <p className="text-xs text-muted-foreground italic">
                    Click a color to see matching product images
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="markup">Price Markup</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceMarkup}
                    onChange={(e) => setPriceMarkup(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Base: ${basePrice.toFixed(2)} → Final: <span className="font-medium">${finalPrice.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {product.is_imported ? (
            <>
              {product.has_changes && onDismissUpdates && (
                <Button variant="ghost" onClick={handleDismiss} disabled={isImporting}>
                  Keep My Version
                </Button>
              )}
              <Button onClick={handleSync} disabled={isImporting}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isImporting ? 'animate-spin' : ''}`} />
                Sync Updates
              </Button>
            </>
          ) : (
            <Button onClick={handleSubmit} disabled={isImporting}>
              <Plus className="h-4 w-4 mr-2" />
              Import to Store
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
