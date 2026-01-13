import { useState, useEffect, useRef, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
  // New props for enhanced optimization
  sizes?: string;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
}

// Memoized component to prevent unnecessary re-renders
export const OptimizedImage = memo(({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  objectFit = "cover",
  onLoad,
  sizes,
  placeholder = "blur",
  blurDataURL,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return; // Skip intersection observer for priority images

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before image enters viewport (increased from 50px)
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  // Generate blur placeholder color based on image URL hash
  const getPlaceholderColor = () => {
    if (blurDataURL) return blurDataURL;
    // Simple hash-based color for consistent placeholder
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = src.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 20%, 85%)`;
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {placeholder === "blur" && !isLoaded && !hasError && (
        <div 
          className="absolute inset-0 animate-pulse transition-opacity duration-300"
          style={{ backgroundColor: getPlaceholderColor() }}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Failed to load</span>
        </div>
      )}
      
      {/* Actual image - only load when in view or priority */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectFit }}
          sizes={sizes}
          {...(width && { width })}
          {...(height && { height })}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";
