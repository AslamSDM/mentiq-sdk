import { AnalyticsEvent } from "./types";

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  const sessionKey = "mentiq_session_id";
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes

  if (typeof window === "undefined") {
    return generateId();
  }

  const stored = sessionStorage.getItem(sessionKey);
  const lastActivity = localStorage.getItem("mentiq_last_activity");

  const now = Date.now();
  const isExpired =
    lastActivity && now - parseInt(lastActivity, 10) > sessionTimeout;

  if (!stored || isExpired) {
    const newSessionId = generateId();
    sessionStorage.setItem(sessionKey, newSessionId);
    localStorage.setItem("mentiq_last_activity", now.toString());
    return newSessionId;
  }

  localStorage.setItem("mentiq_last_activity", now.toString());
  return stored;
}

export function getAnonymousId(): string {
  const key = "mentiq_anonymous_id";

  if (typeof window === "undefined") {
    return generateId();
  }

  let anonymousId = localStorage.getItem(key);
  if (!anonymousId) {
    anonymousId = generateId();
    localStorage.setItem(key, anonymousId);
  }

  return anonymousId;
}

export function getUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("mentiq_user_id");
}

export function setUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("mentiq_user_id", userId);
}

export function clearUserId(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("mentiq_user_id");
}

export function getContext() {
  const context: AnalyticsEvent["context"] = {
    library: {
      name: "mentiq-sdk",
      version: "1.0.0",
    },
  };

  if (typeof window !== "undefined") {
    context.page = {
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      search: window.location.search || undefined,
    };

    context.userAgent = navigator.userAgent;
    context.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    context.locale = navigator.language;
    context.screen = {
      width: window.screen.width,
      height: window.screen.height,
    };
  }

  return context;
}

export function createEvent(
  type: AnalyticsEvent["type"],
  event?: string,
  properties?: any
): AnalyticsEvent {
  // Enrich properties with channel and email if available
  const enrichedProperties = { ...(properties || {}) };

  // Add channel if not already present
  if (!enrichedProperties.channel && typeof window !== "undefined") {
    enrichedProperties.channel = detectChannel();
  }

  // Add email if available and not already present
  if (!enrichedProperties.email) {
    const email = getUserEmail();
    if (email) {
      enrichedProperties.email = email;
    }
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    event,
    properties: enrichedProperties,
    userId: getUserId() || undefined,
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    context: getContext(),
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;

  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

/**
 * Detect acquisition channel from URL parameters and referrer
 */
export function detectChannel(): string {
  if (typeof window === "undefined") {
    return "direct";
  }

  const url = new URL(window.location.href);
  const referrer = document.referrer;

  // Check for UTM parameters (highest priority)
  const utmSource = url.searchParams.get("utm_source");
  const utmMedium = url.searchParams.get("utm_medium");
  const utmCampaign = url.searchParams.get("utm_campaign");

  if (utmSource) {
    // Store UTM parameters for future reference
    try {
      localStorage.setItem("mentiq_utm_source", utmSource);
      if (utmMedium) localStorage.setItem("mentiq_utm_medium", utmMedium);
      if (utmCampaign) localStorage.setItem("mentiq_utm_campaign", utmCampaign);
    } catch (e) {
      console.warn("Failed to store UTM parameters", e);
    }

    return mapUtmToChannel(utmSource, utmMedium);
  }

  // Check for custom tracking parameter (e.g., ?ref=facebook-ad)
  const refParam =
    url.searchParams.get("ref") || url.searchParams.get("referral");
  if (refParam) {
    try {
      localStorage.setItem("mentiq_ref_param", refParam);
    } catch (e) {
      console.warn("Failed to store ref parameter", e);
    }
    return refParam.toLowerCase().replace(/-/g, "_");
  }

  // Check stored UTM parameters (persisted from previous visit)
  const storedUtmSource = localStorage.getItem("mentiq_utm_source");
  if (storedUtmSource) {
    const storedUtmMedium = localStorage.getItem("mentiq_utm_medium");
    return mapUtmToChannel(storedUtmSource, storedUtmMedium);
  }

  // Analyze referrer
  if (referrer && referrer !== "") {
    const channel = getChannelFromReferrer(referrer);
    if (channel !== "direct") {
      try {
        localStorage.setItem("mentiq_channel", channel);
      } catch (e) {
        console.warn("Failed to store channel", e);
      }
      return channel;
    }
  }

  // Check for stored channel (persisted from previous visit)
  const storedChannel = localStorage.getItem("mentiq_channel");
  if (storedChannel) {
    return storedChannel;
  }

  return "direct";
}

/**
 * Map UTM parameters to channel names
 */
function mapUtmToChannel(source: string, medium?: string | null): string {
  const sourceLower = source.toLowerCase();
  const mediumLower = medium?.toLowerCase() || "";

  // Social media channels
  if (sourceLower.includes("facebook") || sourceLower.includes("meta")) {
    return mediumLower.includes("paid") || mediumLower.includes("cpc")
      ? "paid_social_facebook"
      : "organic_social_facebook";
  }
  if (sourceLower.includes("instagram")) {
    return mediumLower.includes("paid") || mediumLower.includes("cpc")
      ? "paid_social_instagram"
      : "organic_social_instagram";
  }
  if (sourceLower.includes("twitter") || sourceLower.includes("x.com")) {
    return mediumLower.includes("paid") || mediumLower.includes("cpc")
      ? "paid_social_twitter"
      : "organic_social_twitter";
  }
  if (sourceLower.includes("linkedin")) {
    return mediumLower.includes("paid") || mediumLower.includes("cpc")
      ? "paid_social_linkedin"
      : "organic_social_linkedin";
  }
  if (sourceLower.includes("tiktok")) {
    return mediumLower.includes("paid") || mediumLower.includes("cpc")
      ? "paid_social_tiktok"
      : "organic_social_tiktok";
  }

  // Search engines
  if (sourceLower.includes("google")) {
    return mediumLower.includes("cpc") || mediumLower.includes("paid")
      ? "paid_search_google"
      : "organic_search_google";
  }
  if (sourceLower.includes("bing")) {
    return mediumLower.includes("cpc") || mediumLower.includes("paid")
      ? "paid_search_bing"
      : "organic_search_bing";
  }

  // Email campaigns
  if (mediumLower.includes("email") || sourceLower.includes("email")) {
    return "email_campaign";
  }

  // Display/Banner ads
  if (mediumLower.includes("display") || mediumLower.includes("banner")) {
    return "display_ads";
  }

  // Affiliate
  if (mediumLower.includes("affiliate") || sourceLower.includes("affiliate")) {
    return "affiliate";
  }

  // Referral
  if (mediumLower.includes("referral")) {
    return "referral";
  }

  // Generic paid
  if (
    mediumLower.includes("cpc") ||
    mediumLower.includes("paid") ||
    mediumLower.includes("ppc")
  ) {
    return `paid_${sourceLower}`;
  }

  return sourceLower;
}

/**
 * Extract channel from referrer URL
 */
function getChannelFromReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    // Social media
    if (hostname.includes("facebook.com") || hostname.includes("fb.com"))
      return "organic_social_facebook";
    if (hostname.includes("instagram.com")) return "organic_social_instagram";
    if (hostname.includes("twitter.com") || hostname.includes("t.co"))
      return "organic_social_twitter";
    if (hostname.includes("linkedin.com")) return "organic_social_linkedin";
    if (hostname.includes("tiktok.com")) return "organic_social_tiktok";
    if (hostname.includes("youtube.com")) return "organic_social_youtube";
    if (hostname.includes("reddit.com")) return "organic_social_reddit";
    if (hostname.includes("pinterest.com")) return "organic_social_pinterest";

    // Search engines
    if (hostname.includes("google.")) return "organic_search_google";
    if (hostname.includes("bing.com")) return "organic_search_bing";
    if (hostname.includes("yahoo.com")) return "organic_search_yahoo";
    if (hostname.includes("duckduckgo.com")) return "organic_search_duckduckgo";
    if (hostname.includes("baidu.com")) return "organic_search_baidu";

    // If referrer exists but not recognized, it's a referral
    return "referral";
  } catch (e) {
    return "direct";
  }
}

/**
 * Get channel from URL parameters (for manual checking)
 */
export function getChannelFromUrl(url?: string): string | null {
  if (typeof window === "undefined" && !url) {
    return null;
  }

  const urlToCheck = url || window.location.href;
  const parsedUrl = new URL(urlToCheck);

  const utmSource = parsedUrl.searchParams.get("utm_source");
  const utmMedium = parsedUrl.searchParams.get("utm_medium");
  const refParam =
    parsedUrl.searchParams.get("ref") || parsedUrl.searchParams.get("referral");

  if (utmSource) {
    return mapUtmToChannel(utmSource, utmMedium);
  }

  if (refParam) {
    return refParam.toLowerCase().replace(/-/g, "_");
  }

  return null;
}

/**
 * Get user email from storage or auth session
 * Checks multiple sources in order of priority:
 * 1. Mentiq-specific storage
 * 2. NextAuth/Auth.js session
 * 3. Supabase auth
 * 4. Firebase auth
 * 5. Clerk auth
 * 6. Custom auth patterns
 */
export function getUserEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // 1. Check Mentiq-specific storage first (highest priority)
  const mentiqEmail = localStorage.getItem("mentiq_user_email");
  if (mentiqEmail) {
    return mentiqEmail;
  }

  // 2. Check NextAuth/Auth.js session (common in Next.js apps)
  try {
    const nextAuthSession =
      localStorage.getItem("next-auth.session-token") ||
      sessionStorage.getItem("next-auth.session-token");
    if (nextAuthSession) {
      // Try to extract from session storage
      const sessionData = sessionStorage.getItem("__next_auth_session__");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed?.user?.email) {
          return parsed.user.email;
        }
      }
    }
  } catch (e) {
    // Silent fail, continue to next check
  }

  // 3. Check Supabase auth
  try {
    const supabaseKeys = Object.keys(localStorage).filter(
      (key) => key.startsWith("sb-") && key.includes("-auth-token")
    );
    for (const key of supabaseKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        const parsed = JSON.parse(token);
        if (parsed?.user?.email) {
          return parsed.user.email;
        }
      }
    }
  } catch (e) {
    // Silent fail, continue to next check
  }

  // 4. Check Firebase auth
  try {
    const firebaseKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith("firebase:authUser:")
    );
    for (const key of firebaseKeys) {
      const userData = localStorage.getItem(key);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed?.email) {
          return parsed.email;
        }
      }
    }
  } catch (e) {
    // Silent fail, continue to next check
  }

  // 5. Check Clerk auth
  try {
    const clerkSession =
      sessionStorage.getItem("__clerk_client_uat") ||
      localStorage.getItem("__clerk_client_uat");
    if (clerkSession) {
      // Clerk stores user data separately
      const clerkKeys = Object.keys(sessionStorage).filter(
        (key) => key.includes("clerk") && key.includes("user")
      );
      for (const key of clerkKeys) {
        const userData = sessionStorage.getItem(key);
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed?.primaryEmailAddress?.emailAddress) {
            return parsed.primaryEmailAddress.emailAddress;
          }
          if (parsed?.emailAddresses?.[0]?.emailAddress) {
            return parsed.emailAddresses[0].emailAddress;
          }
        }
      }
    }
  } catch (e) {
    // Silent fail, continue to next check
  }

  // 6. Check Auth0
  try {
    const auth0Keys = Object.keys(localStorage).filter(
      (key) => key.startsWith("@@auth0") || key.includes("auth0")
    );
    for (const key of auth0Keys) {
      const authData = localStorage.getItem(key);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.body?.decodedToken?.user?.email) {
          return parsed.body.decodedToken.user.email;
        }
        if (parsed?.user?.email) {
          return parsed.user.email;
        }
      }
    }
  } catch (e) {
    // Silent fail, continue to next check
  }

  // 7. Check for common user object patterns in localStorage
  try {
    const commonKeys = ["user", "currentUser", "auth", "session", "userData"];
    for (const key of commonKeys) {
      const data = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed?.email) {
          return parsed.email;
        }
        if (parsed?.user?.email) {
          return parsed.user.email;
        }
      }
    }
  } catch (e) {
    // Silent fail
  }

  // 8. Check cookies as last resort
  try {
    if (typeof document !== "undefined" && document.cookie) {
      // Look for email in cookies
      const emailMatch = document.cookie.match(/email=([^;]+)/);
      if (emailMatch && emailMatch[1]) {
        const decodedEmail = decodeURIComponent(emailMatch[1]);
        // Basic email validation
        if (decodedEmail.includes("@") && decodedEmail.includes(".")) {
          return decodedEmail;
        }
      }
    }
  } catch (e) {
    // Silent fail
  }

  return null;
}
