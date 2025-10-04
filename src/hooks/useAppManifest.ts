import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAppManifest = () => {
  useEffect(() => {
    const updateManifest = async () => {
      try {
        console.log('useAppManifest - Starting...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Manifest fetch timeout')), 3000)
        );
        
        // Fetch app settings with timeout
        const fetchPromise = supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['mobile_app_name', 'mobile_app_icon_url']);

        const { data } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        console.log('useAppManifest - Data received:', data);

        if (!data) {
          console.log('useAppManifest - No data, using defaults');
          return;
        }

        let appName = 'Joy House Community';
        let iconUrl = '';

        data.forEach((setting: any) => {
          try {
            const value = typeof setting.setting_value === 'string'
              ? JSON.parse(setting.setting_value)
              : setting.setting_value;

            if (setting.setting_key === 'mobile_app_name') {
              appName = value;
            } else if (setting.setting_key === 'mobile_app_icon_url') {
              iconUrl = value;
            }
          } catch (e) {
            console.error('Error parsing setting:', e);
          }
        });

        // Update document title
        document.title = appName;

        // Remove any existing manifest links to avoid conflicts
        const existingManifests = document.querySelectorAll('link[rel="manifest"]');
        existingManifests.forEach(link => link.remove());

        // Create new manifest link
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        
        // Create dynamic manifest
        const manifest = {
          name: appName,
          short_name: appName.split(' ').slice(0, 2).join(' '),
          description: 'Spreading Joy Through Special Needs Community',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#F97316',
          orientation: 'portrait-primary',
          icons: iconUrl ? [
            {
              src: iconUrl,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: iconUrl,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ] : [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        };

        // Convert manifest to data URL with cache-busting timestamp
        const manifestJson = JSON.stringify(manifest);
        const manifestBlob = new Blob([manifestJson], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        manifestLink.href = manifestUrl;
        
        // Add to head
        document.head.appendChild(manifestLink);

        // Update or create apple-touch-icon
        let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        if (!appleTouchIcon) {
          appleTouchIcon = document.createElement('link');
          appleTouchIcon.rel = 'apple-touch-icon';
          document.head.appendChild(appleTouchIcon);
        }
        appleTouchIcon.href = iconUrl || '/icon-512.png';

        // Update theme-color meta tag
        let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.name = 'theme-color';
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.content = '#F97316';

        // Update apple-mobile-web-app-title
        let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
        if (!appleTitleMeta) {
          appleTitleMeta = document.createElement('meta');
          appleTitleMeta.name = 'apple-mobile-web-app-title';
          document.head.appendChild(appleTitleMeta);
        }
        appleTitleMeta.content = appName;

        // Enable standalone mode for iOS
        let appleCapableMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement;
        if (!appleCapableMeta) {
          appleCapableMeta = document.createElement('meta');
          appleCapableMeta.name = 'apple-mobile-web-app-capable';
          document.head.appendChild(appleCapableMeta);
        }
        appleCapableMeta.content = 'yes';

      } catch (error) {
        console.error('useAppManifest - Error:', error);
        // Set default title even if fetch fails
        document.title = 'Joy House Community';
      }
    };

    updateManifest();
  }, []);
};
