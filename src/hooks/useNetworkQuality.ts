import { useState, useEffect } from 'react';

type ConnectionQuality = 'slow' | 'medium' | 'fast';

interface NetworkInfo {
  quality: ConnectionQuality;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Hook to detect network quality and provide adaptive loading hints.
 * Uses Network Information API when available, falls back to timing heuristics.
 */
export function useNetworkQuality(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => getInitialNetworkInfo());

  useEffect(() => {
    const connection = getConnection();
    if (!connection) return;

    const updateInfo = () => {
      setNetworkInfo(getNetworkInfoFromConnection(connection));
    };

    connection.addEventListener('change', updateInfo);
    return () => connection.removeEventListener('change', updateInfo);
  }, []);

  return networkInfo;
}

function getConnection(): NetworkInformation | null {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    return (navigator as NavigatorWithConnection).connection;
  }
  return null;
}

function getInitialNetworkInfo(): NetworkInfo {
  const connection = getConnection();
  if (connection) {
    return getNetworkInfoFromConnection(connection);
  }
  // Default to medium quality if Network Information API is not available
  return { quality: 'medium' };
}

function getNetworkInfoFromConnection(connection: NetworkInformation): NetworkInfo {
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink;
  const rtt = connection.rtt;
  const saveData = connection.saveData;

  // If user has data saver enabled, always use low quality
  if (saveData) {
    return { quality: 'slow', effectiveType, downlink, rtt, saveData };
  }

  // Determine quality based on effective connection type
  let quality: ConnectionQuality = 'medium';

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    quality = 'slow';
  } else if (effectiveType === '3g') {
    // Check RTT for more precise 3g quality
    quality = rtt && rtt > 400 ? 'slow' : 'medium';
  } else if (effectiveType === '4g') {
    // Check downlink for 4g quality
    quality = downlink && downlink >= 5 ? 'fast' : 'medium';
  }

  // Additional checks based on raw metrics
  if (downlink !== undefined) {
    if (downlink < 1) quality = 'slow';
    else if (downlink >= 10) quality = 'fast';
  }

  return { quality, effectiveType, downlink, rtt, saveData };
}

/**
 * Get Supabase storage transform parameters based on network quality
 */
export function getImageQualityParams(quality: ConnectionQuality): { width: number; quality: number } {
  switch (quality) {
    case 'slow':
      return { width: 200, quality: 60 };
    case 'medium':
      return { width: 400, quality: 75 };
    case 'fast':
      return { width: 800, quality: 85 };
  }
}

/**
 * Transform a Supabase storage URL to include resize/quality parameters
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  quality: ConnectionQuality
): string {
  if (!imageUrl) return imageUrl;
  
  // Check if this is a Supabase storage URL
  const isSupabaseStorage = imageUrl.includes('/storage/v1/object/');
  
  if (!isSupabaseStorage) {
    return imageUrl; // Can't optimize non-Supabase URLs
  }

  const params = getImageQualityParams(quality);
  
  // Convert to render endpoint for on-the-fly transforms
  // /storage/v1/object/public/bucket/path -> /storage/v1/render/image/public/bucket/path
  const renderUrl = imageUrl.replace(
    '/storage/v1/object/',
    '/storage/v1/render/image/'
  );

  // Add transform parameters
  const separator = renderUrl.includes('?') ? '&' : '?';
  return `${renderUrl}${separator}width=${params.width}&quality=${params.quality}`;
}

// Type definitions for Network Information API
interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection: NetworkInformation;
}
