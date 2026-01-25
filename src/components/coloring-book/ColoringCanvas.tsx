import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eraser, RotateCcw, Save, Download, PaintBucket, Brush, Undo2, Plus, Sticker, Trash2, ZoomIn, ZoomOut, Maximize2, Share2, Loader2, Pipette, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickerPicker } from "./StickerPicker";
import { useCoins } from "@/hooks/useCoins";

// Colors organized by hue: reds, oranges, yellows, greens, blues, purples, pinks, browns, neutrals
const COLORS = [
  // Reds
  "#8B0000", "#FF0000", "#FF6B6B",
  // Oranges  
  "#FF4500", "#FF8C00", "#FFA500",
  // Yellows
  "#FFD700", "#FFFF00", "#FFFACD",
  // Greens
  "#006400", "#228B22", "#32CD32", "#90EE90", "#98FB98",
  // Cyans/Teals
  "#008B8B", "#00CED1", "#40E0D0",
  // Blues
  "#00008B", "#0000FF", "#4169E1", "#87CEEB", "#ADD8E6",
  // Purples
  "#4B0082", "#8B00FF", "#9370DB", "#DDA0DD",
  // Pinks
  "#C71585", "#FF1493", "#FF69B4", "#FFC0CB",
  // Browns
  "#4A2C2A", "#8B4513", "#D2691E", "#DEB887",
  // Neutrals
  "#000000", "#404040", "#808080", "#C0C0C0", "#FFFFFF",
];

interface ColoringCanvasProps {
  page: any;
  onClose: () => void;
}

export function ColoringCanvas({ page, onClose }: ColoringCanvasProps) {
  // Two-layer system: base canvas for image/fills, fabric canvas for brush strokes
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(10);
  const [activeTool, setActiveTool] = useState<"fill" | "brush" | "eraser" | "sticker" | "eyedropper">("fill");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const { user } = useAuth();
  const { awardCoins } = useCoins();
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [unsharing, setUnsharing] = useState(false);
  const [isShared, setIsShared] = useState(page?.isPublic || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [hasSelection, setHasSelection] = useState(false);
  const MAX_HISTORY = 20;

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistance = useRef<number | null>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic canvas dimensions based on image aspect ratio
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const MAX_CANVAS_DIMENSION = 600;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  // Store initial savedCanvasData in a ref to prevent it from being lost on re-renders
  const initialSavedDataRef = useRef<string | null>(page.savedCanvasData || null);
  const hasInitializedRef = useRef(false);

  // Initialize base canvas with the coloring image (or saved data)
  useEffect(() => {
    if (!baseCanvasRef.current) return;
    
    // Prevent re-initialization if we've already loaded saved data
    if (hasInitializedRef.current) {
      return;
    }

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    // Use the ref to get saved data (persists across re-renders)
    const savedCanvasData = initialSavedDataRef.current;

    // Check if we have saved canvas data to restore
    if (savedCanvasData) {
      try {
        const savedData = JSON.parse(savedCanvasData);
        // Support both new format (with dimensions) and old format (baseCanvas only)
        if (savedData.baseCanvas) {
          hasInitializedRef.current = true;
          
          const savedImg = new Image();
          savedImg.onload = () => {
            // Use saved dimensions if available, otherwise use image dimensions
            const restoreWidth = savedData.canvasWidth || savedImg.width;
            const restoreHeight = savedData.canvasHeight || savedImg.height;
            
            setCanvasWidth(restoreWidth);
            setCanvasHeight(restoreHeight);
            baseCanvas.width = restoreWidth;
            baseCanvas.height = restoreHeight;
            
            ctx.drawImage(savedImg, 0, 0);
            
            // Still need to store original image for clear function
            const origImg = new Image();
            origImg.crossOrigin = "anonymous";
            origImg.onload = () => {
              originalImageRef.current = origImg;
              setImageLoaded(true);
            };
            origImg.src = page.image_url;
          };
          savedImg.onerror = (e) => {
            console.error("[ColoringCanvas] Failed to load saved canvas image:", e);
            // Fallback: load original image instead
            hasInitializedRef.current = false;
          };
          savedImg.src = savedData.baseCanvas;
          return;
        }
      } catch (e) {
        console.error("[ColoringCanvas] Failed to parse saved canvas data:", e);
      }
    }
    
    hasInitializedRef.current = true;

    // Load the coloring page image to get its dimensions
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Calculate canvas dimensions based on image aspect ratio
      const aspectRatio = img.width / img.height;
      let newWidth: number;
      let newHeight: number;
      
      if (aspectRatio >= 1) {
        // Landscape or square - fit to max width
        newWidth = MAX_CANVAS_DIMENSION;
        newHeight = MAX_CANVAS_DIMENSION / aspectRatio;
      } else {
        // Portrait - fit to max height
        newHeight = MAX_CANVAS_DIMENSION;
        newWidth = MAX_CANVAS_DIMENSION * aspectRatio;
      }
      
      setCanvasWidth(newWidth);
      setCanvasHeight(newHeight);
      baseCanvas.width = newWidth;
      baseCanvas.height = newHeight;

      // Fill with white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Draw image to fill the entire canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      originalImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("Failed to load coloring page image");
      toast.error("Failed to load image");
    };
    img.src = page.image_url;
  }, [page.image_url]); // Remove savedCanvasData dependency - we use ref now

  // Initialize Fabric.js canvas for brush strokes (transparent overlay)
  useEffect(() => {
    if (!fabricCanvasRef.current || !imageLoaded) return;

    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "transparent",
      isDrawingMode: false,
      enablePointerEvents: true,
      preserveObjectStacking: true,
    });

    // Ensure touch interactions work (especially on mobile Safari)
    try {
      // Fabric creates an upper canvas for events
      (canvas as any).upperCanvasEl && (((canvas as any).upperCanvasEl as HTMLCanvasElement).style.touchAction = "none");
      (canvas as any).upperCanvasEl && (((canvas as any).upperCanvasEl as HTMLCanvasElement).style.pointerEvents = "auto");
    } catch {
      // ignore
    }

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    // Restore saved fabric objects if available (use ref for consistency)
    const savedCanvasData = initialSavedDataRef.current;
    if (savedCanvasData) {
      try {
        const savedData = JSON.parse(savedCanvasData);
        if (savedData.fabricObjects) {
          canvas.loadFromJSON(savedData.fabricObjects, () => {
            canvas.renderAll();
          });
        }
      } catch (e) {
        console.error("[ColoringCanvas] Failed to restore fabric objects:", e);
      }
    }

    // Track selection changes for delete button visibility
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:updated', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));
    
    // Track changes for brush strokes and handle eraser paths
    canvas.on('path:created', (opt: any) => {
      setHasChanges(true);
      // Check if this path was created while in eraser mode
      const path = opt.path;
      if (path && (canvas.freeDrawingBrush as any)?._isEraser) {
        // Remove the visible eraser path immediately
        canvas.remove(path);
        
        // Get the eraser path's bounding box for intersection testing
        const eraserBounds = path.getBoundingRect();
        
        // === ERASE FILLS ON BASE CANVAS ===
        // Use flood fill algorithm to erase entire contiguous fill regions
        if (baseCanvasRef.current && originalImageRef.current) {
          const baseCtx = baseCanvasRef.current.getContext("2d");
          if (baseCtx) {
            const baseWidth = baseCanvasRef.current.width;
            const baseHeight = baseCanvasRef.current.height;
            
            // Save current state to history
            const currentImageData = baseCtx.getImageData(0, 0, baseWidth, baseHeight);
            setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), currentImageData]);
            
            // Get the center point of the eraser path as the starting point
            const startX = Math.floor(eraserBounds.left + eraserBounds.width / 2);
            const startY = Math.floor(eraserBounds.top + eraserBounds.height / 2);
            
            if (startX >= 0 && startX < baseWidth && startY >= 0 && startY < baseHeight) {
              // Create a temp canvas with the original template at the same scale
              const origCanvas = document.createElement('canvas');
              origCanvas.width = baseWidth;
              origCanvas.height = baseHeight;
              const origCtx = origCanvas.getContext('2d');
              if (origCtx) {
                origCtx.drawImage(originalImageRef.current, 0, 0, baseWidth, baseHeight);
                const origData = origCtx.getImageData(0, 0, baseWidth, baseHeight).data;
                
                // Get current canvas data
                const imageData = baseCtx.getImageData(0, 0, baseWidth, baseHeight);
                const data = imageData.data;
                
                // Get starting color
                const getPixelColor = (x: number, y: number) => {
                  const pos = (y * baseWidth + x) * 4;
                  return { r: data[pos], g: data[pos + 1], b: data[pos + 2] };
                };
                
                const startColor = getPixelColor(startX, startY);
                
                // Don't erase very dark pixels (the outlines)
                const isDark = (r: number, g: number, b: number) => r < 60 && g < 60 && b < 60;
                if (!isDark(startColor.r, startColor.g, startColor.b)) {
                  const tolerance = 40;
                  
                  const colorMatch = (x: number, y: number): boolean => {
                    if (x < 0 || x >= baseWidth || y < 0 || y >= baseHeight) return false;
                    const pixel = getPixelColor(x, y);
                    if (isDark(pixel.r, pixel.g, pixel.b)) return false;
                    return (
                      Math.abs(pixel.r - startColor.r) <= tolerance &&
                      Math.abs(pixel.g - startColor.g) <= tolerance &&
                      Math.abs(pixel.b - startColor.b) <= tolerance
                    );
                  };
                  
                  // Flood fill algorithm - restore original pixels
                  const visited = new Uint8Array(baseWidth * baseHeight);
                  const stack: [number, number][] = [[startX, startY]];
                  
                  while (stack.length > 0) {
                    const [x, y] = stack.pop()!;
                    const idx = y * baseWidth + x;
                    
                    if (visited[idx]) continue;
                    if (!colorMatch(x, y)) continue;
                    
                    let left = x;
                    let right = x;
                    
                    while (left > 0 && colorMatch(left - 1, y) && !visited[y * baseWidth + left - 1]) left--;
                    while (right < baseWidth - 1 && colorMatch(right + 1, y) && !visited[y * baseWidth + right + 1]) right++;
                    
                    for (let i = left; i <= right; i++) {
                      const pos = (y * baseWidth + i) * 4;
                      // Restore from original template
                      data[pos] = origData[pos];
                      data[pos + 1] = origData[pos + 1];
                      data[pos + 2] = origData[pos + 2];
                      data[pos + 3] = origData[pos + 3];
                      visited[y * baseWidth + i] = 1;
                      
                      if (y > 0 && !visited[(y - 1) * baseWidth + i] && colorMatch(i, y - 1)) {
                        stack.push([i, y - 1]);
                      }
                      if (y < baseHeight - 1 && !visited[(y + 1) * baseWidth + i] && colorMatch(i, y + 1)) {
                        stack.push([i, y + 1]);
                      }
                    }
                  }
                  
                  baseCtx.putImageData(imageData, 0, 0);
                }
              }
            }
          }
        }
        
        // === ERASE BRUSH STROKES ON FABRIC CANVAS ===
        // Find all objects that intersect with the eraser path and remove them
        const objectsToRemove: any[] = [];
        canvas.getObjects().forEach((obj: any) => {
          // Only remove paths (brush strokes) and images (previously composited strokes)
          if (obj.type === 'path' || obj.type === 'image') {
            const objBounds = obj.getBoundingRect();
            // Check if bounding boxes intersect
            const intersects = !(
              eraserBounds.left > objBounds.left + objBounds.width ||
              eraserBounds.left + eraserBounds.width < objBounds.left ||
              eraserBounds.top > objBounds.top + objBounds.height ||
              eraserBounds.top + eraserBounds.height < objBounds.top
            );
            if (intersects) {
              objectsToRemove.push(obj);
            }
          }
        });
        
        // Remove intersecting objects
        const removedCount = objectsToRemove.length;
        if (removedCount > 0) {
          objectsToRemove.forEach(obj => canvas.remove(obj));
        }
        
        // Always show feedback (fills are always erased in the area)
        toast.success(removedCount > 0 
          ? `Erased area (removed ${removedCount} stroke${removedCount > 1 ? 's' : ''})` 
          : "Erased area");
        
        canvas.renderAll();
      }
    });
    canvas.on('object:modified', () => setHasChanges(true));

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageLoaded]);

  // Keyboard handler for delete/backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
          e.preventDefault();
          fabricCanvas.remove(activeObject);
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          setHasSelection(false);
          toast.success("Sticker deleted");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas]);

  const handleDeleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setHasSelection(false);
      toast.success("Sticker deleted");
    }
  }, [fabricCanvas]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === "brush") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = brushSize;
        // Reset eraser flag
        (fabricCanvas.freeDrawingBrush as any)._isEraser = false;
      }
    } else if (activeTool === "eraser") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      if (fabricCanvas.freeDrawingBrush) {
        // Use semi-transparent red to show eraser preview area
        fabricCanvas.freeDrawingBrush.color = "rgba(255,100,100,0.3)";
        fabricCanvas.freeDrawingBrush.width = brushSize * 2;
        // Flag this brush as eraser so path:created knows to handle it
        (fabricCanvas.freeDrawingBrush as any)._isEraser = true;
      }
    } else if (activeTool === "sticker") {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
      // Make all objects selectable
      fabricCanvas.getObjects().forEach(obj => {
        obj.set({ selectable: true, evented: true });
      });
      fabricCanvas.renderAll();
    } else if (activeTool === "eyedropper") {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = false;
      // Disable object selection in eyedropper mode
      fabricCanvas.getObjects().forEach(obj => {
        obj.set({ selectable: false, evented: false });
      });
      fabricCanvas.renderAll();
    } else {
      // Fill mode
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = false;
      // Disable object selection in fill mode
      fabricCanvas.getObjects().forEach(obj => {
        obj.set({ selectable: false, evented: false });
      });
      fabricCanvas.renderAll();
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  const handleAddSticker = useCallback(async (stickerUrl: string) => {
    if (!fabricCanvas || !stickerUrl) return;

    try {
      const img = await FabricImage.fromURL(stickerUrl, { crossOrigin: "anonymous" });

      // Make sure this object is interactive with visible controls
      img.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        centeredScaling: true,
        centeredRotation: true,
        borderColor: '#FF6B00',
        cornerColor: '#FF6B00',
        cornerStrokeColor: '#FFFFFF',
        cornerStyle: 'circle',
        cornerSize: 14,
        transparentCorners: false,
        borderScaleFactor: 2,
      });

      // Scale sticker to reasonable size (max 120px)
      const maxSize = 120;
      const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
      img.scale(scale);

      img.set({
        left: canvasWidth / 2 - ((img.width || 0) * scale) / 2,
        top: canvasHeight / 2 - ((img.height || 0) * scale) / 2,
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      img.setCoords();
      fabricCanvas.renderAll();

      setShowStickerPicker(false);
      setHasChanges(true);
      toast.success("Sticker added! Drag to move, corners to resize/rotate.");
    } catch (error) {
      console.error("Failed to add sticker:", error);
      toast.error("Failed to add sticker");
    }
  }, [fabricCanvas]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const saveToHistory = useCallback(() => {
    if (!baseCanvasRef.current) return;
    const ctx = baseCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), imageData]);
  }, []);

  const handleUndo = useCallback(() => {
    if (!baseCanvasRef.current || history.length === 0) return;
    const ctx = baseCanvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    if (!baseCanvasRef.current) return;

    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fillRGB = hexToRgb(fillColor);
    if (!fillRGB) return;

    // Get the color at the clicked position
    const getPixelColor = (x: number, y: number) => {
      const pos = (y * width + x) * 4;
      return {
        r: data[pos],
        g: data[pos + 1],
        b: data[pos + 2],
        a: data[pos + 3],
      };
    };

    const startColor = getPixelColor(startX, startY);

    // Don't fill if clicking on the same color
    if (
      startColor.r === fillRGB.r &&
      startColor.g === fillRGB.g &&
      startColor.b === fillRGB.b
    ) {
      return;
    }

    // Don't fill dark GRAYSCALE pixels (the outlines) - stricter threshold to preserve thin lines
    // A pixel is considered a "line" only if it's dark AND grayscale (R≈G≈B)
    // This allows re-filling colored areas while still protecting black/gray outlines
    const isOutlineLine = (r: number, g: number, b: number) => {
      const brightness = (r + g + b) / 3;
      // Check if it's grayscale (R, G, B values are close to each other)
      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const isGrayscale = (maxChannel - minChannel) < 40; // Low saturation = grayscale
      return brightness < 180 && isGrayscale; // Must be BOTH dark AND grayscale to be a line
    };
    
    if (isOutlineLine(startColor.r, startColor.g, startColor.b)) {
      return;
    }

    // Stricter tolerance to prevent bleeding through anti-aliased edges
    const tolerance = 30;

    const colorMatch = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const pixel = getPixelColor(x, y);
      
      // Don't cross any dark or gray pixels (potential line boundaries)
      if (isOutlineLine(pixel.r, pixel.g, pixel.b)) return false;

      return (
        Math.abs(pixel.r - startColor.r) <= tolerance &&
        Math.abs(pixel.g - startColor.g) <= tolerance &&
        Math.abs(pixel.b - startColor.b) <= tolerance
      );
    };

    // Use a scanline flood fill algorithm (more efficient)
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;

      if (visited[idx]) continue;
      if (!colorMatch(x, y)) continue;

      // Find the left and right boundaries
      let left = x;
      let right = x;

      while (left > 0 && colorMatch(left - 1, y) && !visited[(y * width) + left - 1]) {
        left--;
      }
      while (right < width - 1 && colorMatch(right + 1, y) && !visited[(y * width) + right + 1]) {
        right++;
      }

      // Fill the scanline
      for (let i = left; i <= right; i++) {
        const pos = (y * width + i) * 4;
        data[pos] = fillRGB.r;
        data[pos + 1] = fillRGB.g;
        data[pos + 2] = fillRGB.b;
        data[pos + 3] = 255;
        visited[y * width + i] = 1;

        // Check above and below
        if (y > 0 && !visited[(y - 1) * width + i] && colorMatch(i, y - 1)) {
          stack.push([i, y - 1]);
        }
        if (y < height - 1 && !visited[(y + 1) * width + i] && colorMatch(i, y + 1)) {
          stack.push([i, y + 1]);
        }
      }
    }

    // === POST-FILL EDGE FEATHERING PASS ===
    // Catch anti-aliased pixels along outlines that were missed by the main fill
    // Run multiple passes to ensure all edge artifacts are colored
    // Only fill very light pixels (>220) to avoid bleeding through gray anti-aliased lines
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const pos = idx * 4;
          const pixel = { r: data[pos], g: data[pos + 1], b: data[pos + 2] };
          
          // Skip if already filled or if it's a dark/gray pixel (potential line)
          if (visited[idx] || isOutlineLine(pixel.r, pixel.g, pixel.b)) continue;
          
          // Check if this unfilled pixel is adjacent to a filled pixel
          const hasFilledNeighbor = 
            (x > 0 && visited[y * width + (x - 1)]) ||
            (x < width - 1 && visited[y * width + (x + 1)]) ||
            (y > 0 && visited[(y - 1) * width + x]) ||
            (y < height - 1 && visited[(y + 1) * width + x]);
          
          // Only fill if adjacent to filled area and is very light (near white)
          // Raised threshold to 220 to avoid bleeding through gray anti-aliased edges
          if (hasFilledNeighbor && pixel.r > 220 && pixel.g > 220 && pixel.b > 220) {
            data[pos] = fillRGB.r;
            data[pos + 1] = fillRGB.g;
            data[pos + 2] = fillRGB.b;
            data[pos + 3] = 255;
            visited[idx] = 1;
            changed = true;
          }
        }
      }
      // If no pixels changed in this pass, no need for more passes
      if (!changed) break;
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.5, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, MIN_ZOOM);
      if (newZoom === MIN_ZOOM) {
        setPanOffset({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Handle wheel zoom and pan
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom with trackpad
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.25 : 0.25;
        setZoom(prev => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
          if (newZoom === MIN_ZOOM) {
            setPanOffset({ x: 0, y: 0 });
          }
          return newZoom;
        });
      } else if (zoom > 1) {
        // Regular scroll to pan when zoomed in
        e.preventDefault();
        setPanOffset(prev => {
          const maxPan = (zoom - 1) * Math.max(canvasWidth, canvasHeight) / 2;
          return {
            x: Math.max(-maxPan, Math.min(maxPan, prev.x - e.deltaX)),
            y: Math.max(-maxPan, Math.min(maxPan, prev.y - e.deltaY)),
          };
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  // Handle mouse drag to pan when zoomed in
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container || zoom <= 1) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only start panning with middle mouse button or when holding space
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning || !lastPanPoint.current) return;
      
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      
      setPanOffset(prev => {
        const maxPan = (zoom - 1) * Math.max(canvasWidth, canvasHeight) / 2;
        return {
          x: Math.max(-maxPan, Math.min(maxPan, prev.x + dx)),
          y: Math.max(-maxPan, Math.min(maxPan, prev.y + dy)),
        };
      });
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        lastPanPoint.current = null;
        container.style.cursor = zoom > 1 ? 'grab' : 'default';
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Set grab cursor when zoomed
    container.style.cursor = 'grab';

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.style.cursor = 'default';
    };
  }, [zoom, isPanning]);

  // Handle pinch-to-zoom for touch devices
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      } else if (e.touches.length === 1 && zoom > 1) {
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsPanning(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = (distance - lastPinchDistance.current) * 0.01;
        lastPinchDistance.current = distance;
        
        setZoom(prev => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
          if (newZoom === MIN_ZOOM) {
            setPanOffset({ x: 0, y: 0 });
          }
          return newZoom;
        });
      } else if (e.touches.length === 1 && isPanning && lastPanPoint.current && zoom > 1) {
        const dx = e.touches[0].clientX - lastPanPoint.current.x;
        const dy = e.touches[0].clientY - lastPanPoint.current.y;
        lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        
        setPanOffset(prev => {
          const maxPan = (zoom - 1) * Math.max(canvasWidth, canvasHeight) / 2;
          return {
            x: Math.max(-maxPan, Math.min(maxPan, prev.x + dx)),
            y: Math.max(-maxPan, Math.min(maxPan, prev.y + dy)),
          };
        });
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistance.current = null;
      lastPanPoint.current = null;
      setIsPanning(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, isPanning]);

  // Handle click for fill tool and eyedropper
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!baseCanvasRef.current) return;
    if (activeTool !== "fill" && activeTool !== "eyedropper") return;

    const rect = baseCanvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
      if (activeTool === "eyedropper") {
        // Sample color from canvas
        const ctx = baseCanvasRef.current.getContext("2d");
        if (!ctx) return;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
        setActiveColor(hex);
        toast.success(`Color picked: ${hex}`);
      } else {
        saveToHistory();
        floodFill(x, y, activeColor);
        setHasChanges(true);
      }
    }
  }, [activeTool, activeColor, floodFill, saveToHistory]);

  const handleClear = () => {
    if (!baseCanvasRef.current) return;

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw original image
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (originalImageRef.current) {
      const img = originalImageRef.current;
      // Draw image to fill the entire canvas
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    }

    // Clear Fabric.js canvas
    if (fabricCanvas) {
      fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
    }

    setHasChanges(true);
    toast("Canvas cleared!");
  };

  const getCompositeCanvas = (): HTMLCanvasElement | null => {
    if (!baseCanvasRef.current || !fabricCanvasRef.current) return null;

    // Create a composite canvas
    const composite = document.createElement("canvas");
    composite.width = canvasWidth;
    composite.height = canvasHeight;
    const ctx = composite.getContext("2d");
    if (!ctx) return null;

    // Draw base canvas (fills + original image)
    ctx.drawImage(baseCanvasRef.current, 0, 0);

    // Draw Fabric.js canvas (brush strokes) on top
    ctx.drawImage(fabricCanvasRef.current, 0, 0);

    return composite;
  };

  const handleSave = async (makePublic: boolean = false) => {
    if (!user) {
      toast.error("Please sign in to save your work");
      return;
    }

    const composite = getCompositeCanvas();
    if (!composite) return;

    if (makePublic) {
      setSharing(true);
    } else {
      setSaving(true);
    }

    try {
      const thumbnailUrl = composite.toDataURL("image/png", 0.5);
      const canvasData = JSON.stringify({
        baseCanvas: baseCanvasRef.current?.toDataURL("image/png"),
        fabricObjects: fabricCanvas?.toJSON(),
        canvasWidth,
        canvasHeight,
      });

      // Check if this is a new save (for coin rewards)
      const { data: existingSave } = await supabase
        .from("user_colorings")
        .select("id, is_public")
        .eq("user_id", user.id)
        .eq("coloring_page_id", page.id)
        .maybeSingle();

      const isNewSave = !existingSave;
      const isNewShare = makePublic && (!existingSave || !existingSave.is_public);

      const { error } = await supabase.from("user_colorings").upsert({
        user_id: user.id,
        coloring_page_id: page.id,
        canvas_data: canvasData,
        thumbnail_url: thumbnailUrl,
        is_public: makePublic ? true : undefined,
      }, { onConflict: 'user_id,coloring_page_id' });

      if (error) throw error;

      // Award coins for new saves
      if (isNewSave) {
        const { data: saveReward } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount, is_active")
          .eq("reward_key", "coloring_save")
          .single();
        
        if (saveReward?.is_active && saveReward.coins_amount > 0) {
          await awardCoins(user.id, saveReward.coins_amount, "Saved a coloring page");
        }
      }

      // Award coins for new shares
      if (isNewShare) {
        const { data: shareReward } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount, is_active")
          .eq("reward_key", "coloring_share")
          .single();
        
        if (shareReward?.is_active && shareReward.coins_amount > 0) {
          await awardCoins(user.id, shareReward.coins_amount, "Shared a coloring with the community");
        }
      }

      if (makePublic) {
        setIsShared(true);
        toast.success("Saved & shared with the community! 🎨");
      } else {
        toast.success("Saved!");
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!user) return;
    setUnsharing(true);
    try {
      const { error } = await supabase
        .from("user_colorings")
        .update({ is_public: false })
        .eq("user_id", user.id)
        .eq("coloring_page_id", page.id);

      if (error) throw error;
      setIsShared(false);
      toast.success("Drawing unshared - now private");
    } catch (error) {
      console.error("Unshare error:", error);
      toast.error("Failed to unshare");
    } finally {
      setUnsharing(false);
    }
  };

  const handleDownload = () => {
    const composite = getCompositeCanvas();
    if (!composite) return;

    const dataUrl = composite.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${page.title}-colored.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Downloaded!");
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas Container with Zoom */}
        <div ref={containerRef} className="flex-1 flex flex-col items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-muted/80 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              title="Zoom out"
              className="h-8 w-8"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              title="Zoom in"
              className="h-8 w-8"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              disabled={zoom === 1}
              title="Reset zoom"
              className="h-8 w-8"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoomable Canvas Area */}
          <div
            ref={zoomContainerRef}
            className="relative border-4 border-primary/20 rounded-lg overflow-hidden shadow-lg"
            style={{
              width: "100%",
              maxWidth: canvasWidth,
              aspectRatio: `${canvasWidth} / ${canvasHeight}`,
              cursor:
                zoom > 1
                  ? isPanning
                    ? "grabbing"
                    : "grab"
                  : activeTool === "fill"
                    ? "crosshair"
                    : activeTool === "eyedropper"
                      ? "crosshair"
                      : "default",
            }}
          >
            <div
              className="absolute inset-0 origin-center transition-transform duration-100"
              style={{
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
              }}
              onClick={(activeTool === "fill" || activeTool === "eyedropper") && !isPanning ? handleCanvasClick : undefined}
            >
              {/* Base canvas for image and fills */}
              <canvas
                ref={baseCanvasRef}
                className="absolute inset-0"
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  pointerEvents: "none" 
                }}
              />
              {/* Fabric.js canvas for brush strokes and stickers */}
              <canvas
                ref={fabricCanvasRef}
                className="absolute inset-0"
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  pointerEvents: activeTool === "fill" ? "none" : "auto" 
                }}
              />
            </div>
          </div>

          {/* Zoom hint */}
          {zoom > 1 && (
            <div className="text-xs text-muted-foreground">Drag to pan • Pinch or Ctrl+scroll to zoom</div>
          )}
        </div>

        {/* Tools Panel */}
        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-card rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Tool</h3>

              {hasSelection && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteSelected}
                  title="Delete selected sticker"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Tool Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={activeTool === "fill" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveTool("fill")}
                className="gap-1"
              >
                <PaintBucket className="w-4 h-4" />
                Fill
              </Button>
              <Button
                variant={activeTool === "brush" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveTool("brush")}
                className="gap-1"
              >
                <Brush className="w-4 h-4" />
                Brush
              </Button>
              <Button
                variant={activeTool === "eraser" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveTool("eraser")}
                className="gap-1"
              >
                <Eraser className="w-4 h-4" />
                Erase
              </Button>
              <Button
                variant={activeTool === "eyedropper" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveTool("eyedropper")}
                className="gap-1"
                title="Pick color from canvas"
              >
                <Pipette className="w-4 h-4" />
                Pick
              </Button>
            </div>

            <Button
              variant={activeTool === "sticker" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTool("sticker");
                setShowStickerPicker(true);
              }}
              className="w-full mt-2 gap-2"
            >
              <Sticker className="w-4 h-4" />
              Add Sticker
            </Button>

            {/* Brush size */}
            {(activeTool === "brush" || activeTool === "eraser") && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Size</span>
                  <span className="text-sm text-muted-foreground">{brushSize}px</span>
                </div>
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0] || 10)}
                  min={2}
                  max={50}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="bg-card rounded-lg p-4 shadow-sm border">
            <h3 className="font-semibold mb-3">Colors</h3>
            <div className="max-h-40 overflow-y-auto pr-1">
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      activeColor === color ? "border-primary scale-110" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {customColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      activeColor === color ? "border-primary scale-110" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Pick Color</div>
              <input
                type="color"
                value={activeColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setActiveColor(newColor);
                  // Auto-save custom colors (keep 10 most recent, no duplicates)
                  if (!COLORS.includes(newColor) && !customColors.includes(newColor)) {
                    setCustomColors((prev) => {
                      const updated = [newColor, ...prev.filter(c => c !== newColor)];
                      return updated.slice(0, 10);
                    });
                  }
                }}
                className="h-10 w-full p-0 border border-border rounded cursor-pointer"
                aria-label="Pick custom color"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={history.length === 0}>
                <Undo2 className="w-4 h-4 mr-2" />
                Undo
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all colors?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset your coloring page back to the original image.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Save / Download */}
          <div className="bg-card rounded-lg p-4 shadow-sm border">
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleSave(false)} disabled={saving || sharing || !hasChanges} className="w-full">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                {saving ? "Saving..." : "Save"}
              </Button>

              {isShared ? (
                <Button
                  variant="secondary"
                  onClick={handleUnshare}
                  disabled={saving || sharing || unsharing}
                  className="w-full"
                >
                  {unsharing ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <EyeOff className="w-4 h-4 mr-1" />
                  )}
                  {unsharing ? "Unsharing..." : "Unshare"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => handleSave(true)}
                  disabled={saving || sharing}
                  className="w-full"
                >
                  {sharing ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-1" />
                  )}
                  {sharing ? "Sharing..." : "Save & Share"}
                </Button>
              )}

              <Button variant="outline" onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>

            {/* Tool hint */}
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded mt-3">
              {activeTool === "fill" && "Tap inside any white area to fill it with color"}
              {activeTool === "brush" && "Draw freely with your finger or mouse"}
              {activeTool === "eraser" && "Erase brush strokes"}
              {activeTool === "sticker" && "Select a sticker, then drag to move or resize it"}
            </div>
          </div>
        </div>

        {/* Sticker Picker */}
        <StickerPicker
          open={showStickerPicker}
          onOpenChange={setShowStickerPicker}
          onSelectSticker={handleAddSticker}
        />
      </div>
    </div>
  );
}
