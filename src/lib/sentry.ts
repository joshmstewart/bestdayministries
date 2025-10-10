import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";

let sentryInitialized = false;

export const initializeSentry = async () => {
  if (sentryInitialized) return;

  try {
    // Fetch Sentry DSN from edge function
    const { data, error } = await supabase.functions.invoke('get-sentry-dsn');
    
    if (error || !data?.dsn) {
      console.warn('Sentry DSN not available:', error);
      return;
    }

    Sentry.init({
      dsn: data.dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
        // Auto-capture console errors as logs
        Sentry.consoleLoggingIntegration({ 
          levels: ['error', 'warn'] 
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions
      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% with errors
      // Logs
      enableLogs: true,
      // Send user IP and other PII for better debugging
      sendDefaultPii: true,
      // Environment
      environment: import.meta.env.MODE,
      beforeSend(event) {
        // Add custom context or filter events here
        return event;
      },
    });

    sentryInitialized = true;
    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
};

// Helper to manually capture exceptions
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (sentryInitialized) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Sentry not initialized, logging error:', error, context);
  }
};

// Helper to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (sentryInitialized) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`Sentry not initialized, logging message [${level}]:`, message);
  }
};

// Helper to set user context
export const setUser = (user: { id: string; email?: string; username?: string }) => {
  if (sentryInitialized) {
    Sentry.setUser(user);
  }
};

// Helper to clear user context
export const clearUser = () => {
  if (sentryInitialized) {
    Sentry.setUser(null);
  }
};
