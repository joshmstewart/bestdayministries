import { useEffect, useState } from 'react';

let isScriptLoaded = false;
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

export function useGoogleMapsScript(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === "PLACEHOLDER") {
      return;
    }

    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (scriptLoadPromise) {
      scriptLoadPromise.then(() => setIsLoaded(true)).catch(setLoadError);
      return;
    }

    if (isScriptLoading) {
      return;
    }

    isScriptLoading = true;
    
    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        isScriptLoaded = true;
        isScriptLoading = false;
        console.log('Google Maps script loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        isScriptLoading = false;
        const error = new Error('Failed to load Google Maps script');
        reject(error);
      };
      
      document.head.appendChild(script);
    });

    scriptLoadPromise
      .then(() => setIsLoaded(true))
      .catch(setLoadError);
  }, [apiKey]);

  return { isLoaded, loadError };
}
