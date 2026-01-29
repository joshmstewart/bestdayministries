import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = "G-3CP9NVT9GM";

/**
 * Initialize Google Analytics 4
 * Should be called once at app startup
 */
export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID);
};

/**
 * Track a page view
 */
export const trackPageView = (path: string, title?: string) => {
  ReactGA.send({
    hitType: "pageview",
    page: path,
    title: title || document.title,
  });
};

/**
 * Track a custom event
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

/**
 * Track tab/button clicks
 */
export const trackTabClick = (tabName: string, pageUrl: string) => {
  ReactGA.event({
    category: "Navigation",
    action: "Tab Click",
    label: `${tabName} on ${pageUrl}`,
  });
};

/**
 * Track product views
 */
export const trackProductView = (productId: string, productName?: string) => {
  ReactGA.event({
    category: "Ecommerce",
    action: "View Product",
    label: productName || productId,
  });
};

/**
 * Track user sign up
 */
export const trackSignUp = (method: string = "email") => {
  ReactGA.event({
    category: "User",
    action: "Sign Up",
    label: method,
  });
};

/**
 * Track user login
 */
export const trackLogin = (method: string = "email") => {
  ReactGA.event({
    category: "User",
    action: "Login",
    label: method,
  });
};

/**
 * Track donation/sponsorship started
 */
export const trackDonationStart = (type: string, amount?: number) => {
  ReactGA.event({
    category: "Donation",
    action: "Start Checkout",
    label: type,
    value: amount,
  });
};

/**
 * Track donation/sponsorship completed
 */
export const trackDonationComplete = (type: string, amount?: number) => {
  ReactGA.event({
    category: "Donation",
    action: "Complete",
    label: type,
    value: amount,
  });
};
