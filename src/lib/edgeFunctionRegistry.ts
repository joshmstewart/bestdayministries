/**
 * Edge Function Registry
 * 
 * Categorizes all edge functions by criticality tier for health checking.
 * - critical: Login, payments, webhooks — if these fail, users are blocked or revenue is lost
 * - important: User-facing features — degraded experience but not catastrophic
 * - utility: Admin tools, batch jobs, seeds — internal use only
 */

export type FunctionTier = 'critical' | 'important' | 'utility';

export interface FunctionRegistryEntry {
  name: string;
  tier: FunctionTier;
  description?: string;
}

const critical: FunctionRegistryEntry[] = [
  { name: 'picture-password-login', tier: 'critical', description: 'Bestie picture login' },
  { name: 'stripe-webhook', tier: 'critical', description: 'Stripe event processing' },
  { name: 'create-sponsorship-checkout', tier: 'critical', description: 'Sponsorship payment flow' },
  { name: 'verify-sponsorship-payment', tier: 'critical', description: 'Sponsorship payment verification' },
  { name: 'create-marketplace-checkout', tier: 'critical', description: 'Store checkout' },
  { name: 'verify-marketplace-payment', tier: 'critical', description: 'Store payment verification' },
  { name: 'create-donation-checkout', tier: 'critical', description: 'Donation payment flow' },
  { name: 'reconcile-donations-from-stripe', tier: 'critical', description: 'Fix stuck pending donations' },
  { name: 'manage-sponsorship', tier: 'critical', description: 'Sponsor portal access' },
  { name: 'update-sponsorship', tier: 'critical', description: 'Tier changes' },
];

const important: FunctionRegistryEntry[] = [
  { name: 'text-to-speech', tier: 'important', description: 'TTS for accessibility' },
  { name: 'text-to-speech-bestie', tier: 'important', description: 'Bestie TTS voice' },
  { name: 'moderate-content', tier: 'important', description: 'Content moderation' },
  { name: 'moderate-image', tier: 'important', description: 'Image moderation' },
  { name: 'moderate-video', tier: 'important', description: 'Video moderation' },
  { name: 'scratch-card', tier: 'important', description: 'Daily scratch card game' },
  { name: 'scratch-daily-card', tier: 'important', description: 'Daily card generation' },
  { name: 'purchase-bonus-card', tier: 'important', description: 'Bonus card purchase' },
  { name: 'generate-recipe-suggestions', tier: 'important', description: 'Recipe AI suggestions' },
  { name: 'generate-full-recipe', tier: 'important', description: 'Full recipe generation' },
  { name: 'regenerate-recipe-image', tier: 'important', description: 'Recipe image regen' },
  { name: 'generate-recipe-expansion-tips', tier: 'important', description: 'Recipe shopping tips' },
  { name: 'generate-coloring-page-ideas', tier: 'important', description: 'Coloring page ideas' },
  { name: 'generate-coloring-page', tier: 'important', description: 'Coloring page generation' },
  { name: 'generate-memory-match-icon', tier: 'important', description: 'Memory match icons' },
  { name: 'generate-memory-match-card-back', tier: 'important', description: 'Card back generation' },
  { name: 'generate-memory-match-description', tier: 'important', description: 'Match descriptions' },
  { name: 'send-newsletter', tier: 'important', description: 'Newsletter sending' },
  { name: 'send-sponsorship-receipt', tier: 'important', description: 'Receipt emails' },
  { name: 'send-notification-email', tier: 'important', description: 'Email notifications' },
  { name: 'send-digest-email', tier: 'important', description: 'Digest emails' },
  { name: 'send-contact-email', tier: 'important', description: 'Contact form emails' },
  { name: 'send-contact-reply', tier: 'important', description: 'Contact reply emails' },
  { name: 'notify-admin-new-contact', tier: 'important', description: 'Admin contact alerts' },
  { name: 'send-approval-notification', tier: 'important', description: 'Approval notifications' },
  { name: 'send-message-notification', tier: 'important', description: 'Message notifications' },
  { name: 'record-terms-acceptance', tier: 'important', description: 'Terms of service' },
  { name: 'create-user', tier: 'important', description: 'User creation' },
  { name: 'delete-user', tier: 'important', description: 'User deletion' },
  { name: 'update-user-role', tier: 'important', description: 'Role management' },
  { name: 'get-google-places-key', tier: 'important', description: 'Location autocomplete' },
  { name: 'lookup-guest-order', tier: 'important', description: 'Guest order lookup' },
  { name: 'create-stripe-connect-account', tier: 'important', description: 'Vendor Stripe onboard' },
  { name: 'check-stripe-connect-status', tier: 'important', description: 'Vendor Stripe status' },
  { name: 'submit-tracking', tier: 'important', description: 'Order tracking' },
  { name: 'send-order-shipped', tier: 'important', description: 'Shipped notification' },
  { name: 'broadcast-product-update', tier: 'important', description: 'Product update alerts' },
  { name: 'unsubscribe-newsletter', tier: 'important', description: 'Newsletter unsubscribe' },
  { name: 'track-newsletter-click', tier: 'important', description: 'Newsletter analytics' },
  { name: 'process-inbound-email', tier: 'important', description: 'Inbound email routing' },
  { name: 'generate-sitemap', tier: 'important', description: 'SEO sitemap' },
  { name: 'generate-meta-tags', tier: 'important', description: 'SEO meta tags' },
  { name: 'claim-streak-reward', tier: 'important', description: 'Streak rewards' },
  { name: 'get-donation-history', tier: 'important', description: 'Donation history' },
  { name: 'generate-avatar-image', tier: 'important', description: 'Avatar generation' },
  { name: 'generate-workout-image', tier: 'important', description: 'Workout celebration' },
  { name: 'generate-workout-location-image', tier: 'important', description: 'Workout location art' },
  { name: 'extract-pdf-pages', tier: 'important', description: 'PDF page extraction' },
  { name: 'send-vendor-order-notification', tier: 'important', description: 'Vendor order alerts' },
  { name: 'printify-webhook', tier: 'important', description: 'Printify fulfillment events' },
  { name: 'create-printify-order', tier: 'important', description: 'POD order fulfillment' },
];

const utility: FunctionRegistryEntry[] = [
  { name: 'health-check', tier: 'utility', description: 'This health check function' },
  { name: 'seed-email-test-data', tier: 'utility', description: 'Test data seeding' },
  { name: 'set-test-admin-roles', tier: 'utility', description: 'Test role setup' },
  { name: 'cleanup-test-data-unified', tier: 'utility', description: 'Test cleanup' },
  { name: 'setup-test-sponsorship', tier: 'utility', description: 'Test sponsorship setup' },
  { name: 'test-contact-form-helper', tier: 'utility', description: 'Contact form test' },
  { name: 'github-test-webhook', tier: 'utility', description: 'CI webhook receiver' },
  { name: 'get-sentry-dsn', tier: 'utility', description: 'Error tracking config' },
  { name: 'sentry-webhook', tier: 'utility', description: 'Error log ingestion' },
  { name: 'debug-donation-reconciliation', tier: 'utility', description: 'Donation debug tool' },
  { name: 'cleanup-duplicate-donations', tier: 'utility', description: 'Donation cleanup' },
  { name: 'generate-missing-receipts', tier: 'utility', description: 'Batch receipt generation' },
  { name: 'generate-missing-donation-receipts', tier: 'utility', description: 'Donation receipt batch' },
  { name: 'send-missing-receipt-emails', tier: 'utility', description: 'Batch receipt emails' },
  { name: 'generate-year-end-summary', tier: 'utility', description: 'Year-end summaries' },
  { name: 'send-batch-year-end-summaries', tier: 'utility', description: 'Batch year-end emails' },
  { name: 'sync-donation-history', tier: 'utility', description: 'Stripe sync cron' },
  { name: 'create-donation-from-stripe', tier: 'utility', description: 'Manual donation create' },
  { name: 'donation-mapping-snapshot', tier: 'utility', description: 'Donation mapping tool' },
  { name: 'aftership-webhook', tier: 'utility', description: 'AfterShip events (inactive)' },
  { name: 'fetch-printify-products', tier: 'utility', description: 'Printify catalog sync' },
  { name: 'import-printify-product', tier: 'utility', description: 'Printify product import' },
  { name: 'check-printify-status', tier: 'utility', description: 'Printify status check' },
  { name: 'seed-valentine-stickers', tier: 'utility', description: 'Valentine sticker seed' },
  { name: 'seed-halloween-stickers', tier: 'utility', description: 'Halloween sticker seed' },
  { name: 'generate-sticker-description', tier: 'utility', description: 'Sticker AI description' },
  { name: 'generate-vibe-icon', tier: 'utility', description: 'Drink vibe icon gen' },
  { name: 'generate-ingredient-icon', tier: 'utility', description: 'Ingredient icon gen' },
  { name: 'generate-recipe-ingredient-icon', tier: 'utility', description: 'Recipe ingredient icon' },
  { name: 'generate-recipe-tool-icon', tier: 'utility', description: 'Recipe tool icon' },
  { name: 'backfill-recipe-tools', tier: 'utility', description: 'Recipe tool backfill' },
  { name: 'send-test-newsletter', tier: 'utility', description: 'Newsletter test send' },
  { name: 'process-newsletter-queue', tier: 'utility', description: 'Newsletter queue cron' },
  { name: 'resend-webhook', tier: 'utility', description: 'Resend events' },
  { name: 'handle-resend-webhook', tier: 'utility', description: 'Resend event handler' },
  { name: 'sync-newsletter-analytics', tier: 'utility', description: 'Newsletter stats sync' },
  { name: 'sync-order-to-shipstation', tier: 'utility', description: 'ShipStation sync' },
  { name: 'poll-shipstation-status', tier: 'utility', description: 'ShipStation polling' },
  { name: 'poll-aftership-status', tier: 'utility', description: 'AfterShip polling' },
  { name: 'reconcile-marketplace-orders', tier: 'utility', description: 'Order reconciliation' },
  { name: 'retry-vendor-transfers', tier: 'utility', description: 'Vendor payout retry' },
  { name: 'process-platform-payout', tier: 'utility', description: 'Platform payout' },
  { name: 'process-event-email-queue', tier: 'utility', description: 'Event email queue' },
  { name: 'award-time-trial-rewards', tier: 'utility', description: 'Monthly rewards' },
  { name: 'generate-wordle-word-scheduled', tier: 'utility', description: 'Daily Wordle word' },
  { name: 'generate-fortune-posts', tier: 'utility', description: 'Daily fortunes' },
  { name: 'generate-fortunes-batch', tier: 'utility', description: 'Fortune batch gen' },
  { name: 'recover-all-missing-donations', tier: 'utility', description: 'Donation recovery' },
];

export const FUNCTION_REGISTRY: FunctionRegistryEntry[] = [
  ...critical,
  ...important,
  ...utility,
];

export function getFunctionsByTier(tier: FunctionTier): FunctionRegistryEntry[] {
  return FUNCTION_REGISTRY.filter(f => f.tier === tier);
}

export function getCriticalFunctions(): FunctionRegistryEntry[] {
  return getFunctionsByTier('critical');
}

export function getAllFunctionNames(): string[] {
  return FUNCTION_REGISTRY.map(f => f.name);
}

export function getFunctionTier(name: string): FunctionTier {
  const entry = FUNCTION_REGISTRY.find(f => f.name === name);
  return entry?.tier ?? 'utility';
}

export const TIER_CONFIG = {
  critical: { label: 'Critical', color: 'destructive' as const, description: 'Login, payments, webhooks' },
  important: { label: 'Important', color: 'default' as const, description: 'User-facing features' },
  utility: { label: 'Utility', color: 'secondary' as const, description: 'Admin tools & batch jobs' },
} as const;
