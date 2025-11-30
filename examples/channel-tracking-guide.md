# Channel Tracking and Email Integration Examples

## Overview

The Mentiq SDK now automatically tracks user acquisition channels and supports email tracking for identifying at-risk users.

## Table of Contents

1. [Automatic Channel Detection](#automatic-channel-detection)
2. [Email Tracking](#email-tracking)
3. [UTM Parameters](#utm-parameters)
4. [Custom Tracking Links](#custom-tracking-links)
5. [Dashboard Usage](#dashboard-usage)

---

## Automatic Channel Detection

The SDK automatically detects channels without any additional configuration:

```typescript
import { Analytics } from "mentiq-sdk";

const analytics = new Analytics({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  enableAutoPageTracking: true,
});

// Initialize - channel is automatically detected
analytics.init();

// All events will include channel information
analytics.track("button_click", {
  button_name: "Get Started",
});
// Channel is automatically added to event properties
```

### Supported Channels

The SDK automatically detects:

- **Search Engines**: Google, Bing, Yahoo, DuckDuckGo
- **Social Media**: Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, Reddit, Pinterest
- **Direct Traffic**: When no referrer is present
- **Referral**: From other websites
- **Email Campaigns**: Via UTM parameters
- **Paid vs Organic**: Determined by UTM medium or referrer

---

## Email Tracking

### 🎯 Automatic Email Detection (NEW!)

The SDK **automatically detects** user email from common authentication sessions during initialization:

```typescript
import { Analytics } from "mentiq-sdk";

const analytics = new Analytics({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  debug: true, // See when email is auto-detected
});

// Email is automatically detected from:
// - NextAuth/Auth.js sessions
// - Supabase auth
// - Firebase auth
// - Clerk auth
// - Auth0
// - Custom auth patterns
// - Cookies
analytics.init();
// Console: "MentiQ: Auto-detected user email from auth session: user@example.com"

// No need to manually identify if user is already authenticated!
```

### Supported Auth Providers

The SDK automatically checks for email in:

1. **NextAuth/Auth.js** - `next-auth.session-token` and session storage
2. **Supabase** - `sb-*-auth-token` in localStorage
3. **Firebase** - `firebase:authUser:*` in localStorage
4. **Clerk** - `__clerk_client_uat` and user data in sessionStorage
5. **Auth0** - `@@auth0*` keys in localStorage
6. **Common patterns** - `user`, `currentUser`, `auth`, `session` keys
7. **Cookies** - `email` cookie parameter

### Manual Email Identification

You can still manually identify users when needed:

```typescript
// Basic identification with email
analytics.identify("user-123", {
  email: "user@example.com",
  name: "John Doe",
});

// Email is stored and included in all subsequent events
analytics.track("purchase", {
  amount: 99.99,
});
```

### React Example with Auto-Detection

```tsx
import { useEffect } from "react";
import { Analytics } from "mentiq-sdk";

function App() {
  const analytics = new Analytics({
    apiKey: process.env.NEXT_PUBLIC_MENTIQ_API_KEY!,
    projectId: process.env.NEXT_PUBLIC_MENTIQ_PROJECT_ID!,
    debug: true, // Enable to see auto-detection logs
  });

  useEffect(() => {
    // Email is automatically detected from auth session
    analytics.init();
    // Check console for: "MentiQ: Auto-detected user email from auth session"
  }, []);

  const handleSignup = async (userData: { email: string; name: string }) => {
    // Only needed if email wasn't auto-detected or you want to update it
    analytics.identify(userData.email, {
      email: userData.email,
      name: userData.name,
      signup_date: new Date().toISOString(),
    });
  };

  return (
    <div>
      <SignupForm onSubmit={handleSignup} />
    </div>
  );
}
```

### How Auto-Detection Works

1. When `analytics.init()` is called, the SDK scans:

   - localStorage for auth tokens
   - sessionStorage for session data
   - Cookies for email values

2. If an email is found, it's automatically stored in `mentiq_user_email`

3. All subsequent events include the email in their properties

4. Email persists across page refreshes via localStorage

5. Manual `identify()` calls will override auto-detected email

---

## UTM Parameters

Use UTM parameters in your marketing campaigns to track channels precisely:

### Google Ads Example

```
https://yourwebsite.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale
```

Detected as: `paid_search_google`

### Facebook Ads Example

```
https://yourwebsite.com?utm_source=facebook&utm_medium=paid&utm_campaign=product_launch
```

Detected as: `paid_social_facebook`

### Email Campaign Example

```
https://yourwebsite.com?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest
```

Detected as: `email_campaign`

### The SDK automatically:

1. Parses UTM parameters from the URL
2. Stores them in localStorage for persistence
3. Includes them in all analytics events
4. Maps them to standardized channel names

---

## Custom Tracking Links

Use custom ref parameters for specific campaigns:

```
https://yourwebsite.com?ref=instagram-bio
https://yourwebsite.com?ref=youtube-description
https://yourwebsite.com?referral=partner-site
```

These are captured as custom channels:

- `instagram_bio`
- `youtube_description`
- `partner_site`

```typescript
// Manual channel override (rare, usually automatic is sufficient)
analytics.track("landing_page_view", {
  channel: "custom_channel_name",
  campaign: "special_promotion",
});
```

---

## Channel Mapping

The SDK intelligently maps sources to channels:

| UTM Source | UTM Medium       | Detected Channel        |
| ---------- | ---------------- | ----------------------- |
| google     | cpc / paid       | paid_search_google      |
| google     | organic / (none) | organic_search_google   |
| facebook   | paid / cpc       | paid_social_facebook    |
| facebook   | organic / (none) | organic_social_facebook |
| instagram  | paid             | paid_social_instagram   |
| twitter    | (any)            | organic_social_twitter  |
| email      | email            | email_campaign          |
| (none)     | (none)           | direct                  |

---

## Dashboard Usage

### View Churn by Channel

1. Navigate to **Churn by Channel** in the dashboard
2. See metrics for each acquisition channel:
   - Total users
   - Active users
   - Churned users
   - Churn rate
   - At-risk users

### Identify At-Risk Users

The dashboard displays users who:

- Have been inactive for 3-14 days
- Have email addresses on file
- Have a calculated risk score

Example output:

| User ID  | Email            | Last Activity | Days Inactive | Risk Score |
| -------- | ---------------- | ------------- | ------------- | ---------- |
| user-123 | john@example.com | 2024-01-15    | 7             | 45%        |
| user-456 | jane@example.com | 2024-01-10    | 12            | 82%        |

### Export for Email Campaigns

Use the at-risk user list to:

1. Create targeted re-engagement email campaigns
2. Offer special promotions to specific channels
3. A/B test retention strategies by channel

---

## Advanced Usage

### Server-Side Channel Tracking

```typescript
// Node.js backend example
import { Analytics } from "mentiq-sdk";

const analytics = new Analytics({
  apiKey: process.env.MENTIQ_API_KEY,
  projectId: process.env.MENTIQ_PROJECT_ID,
});

// Track server-side events with channel info
app.post("/api/webhook", (req, res) => {
  const { userId, email, referralSource } = req.body;

  analytics.identify(userId, {
    email,
    channel: referralSource,
  });

  analytics.track("webhook_received", {
    source: referralSource,
  });

  res.json({ success: true });
});
```

### Multi-Touch Attribution

```typescript
// Track multiple touchpoints
analytics.track("touchpoint", {
  type: "first_visit",
  channel: "organic_search_google",
});

// Later...
analytics.track("touchpoint", {
  type: "email_click",
  channel: "email_campaign",
});

// Finally...
analytics.track("conversion", {
  type: "purchase",
  amount: 99.99,
  // All previous touchpoints are tracked in session
});
```

---

## Best Practices

1. **Always Identify Users with Email**: Call `identify()` with email as soon as it's available
2. **Use Consistent UTM Parameters**: Create a naming convention for campaigns
3. **Test Your Links**: Verify UTM parameters are working before launching campaigns
4. **Monitor the Dashboard**: Regularly check churn by channel to optimize acquisition
5. **Set Up Alerts**: Create automated alerts for high-risk users in specific channels

---

## API Reference

### Analytics.identify()

```typescript
analytics.identify(userId: string, traits?: {
  email?: string;
  [key: string]: any;
}): void
```

### Automatic Channel Detection

The SDK exports utility functions for manual usage:

```typescript
import { detectChannel, getChannelFromUrl } from "mentiq-sdk/utils";

// Get current channel
const channel = detectChannel();
console.log(channel); // e.g., "organic_search_google"

// Parse channel from specific URL
const customChannel = getChannelFromUrl(
  "https://example.com?utm_source=facebook&utm_medium=paid"
);
console.log(customChannel); // "paid_social_facebook"
```

---

## Troubleshooting

### Channel Not Detected

- Verify URL parameters are correctly formatted
- Check browser console for any SDK errors
- Ensure `analytics.init()` is called before tracking events

### Email Not Auto-Detected

If automatic email detection isn't working:

1. **Enable Debug Mode**:

   ```typescript
   const analytics = new Analytics({
     apiKey: "your-api-key",
     projectId: "your-project-id",
     debug: true,
   });
   ```

2. **Check Auth Provider Storage**:

   - Open browser DevTools → Application/Storage
   - Check localStorage for auth-related keys
   - Check sessionStorage for session data
   - Verify your auth provider stores email in accessible format

3. **Manually Test Detection**:

   ```typescript
   import { getUserEmail } from "mentiq-sdk/utils";
   console.log("Detected email:", getUserEmail());
   ```

4. **Common Issues**:

   - Auth session not yet initialized when `init()` is called
   - Email stored in encrypted/encoded format
   - Auth provider uses custom storage keys
   - User hasn't logged in yet

5. **Workaround - Manual Identification**:
   ```typescript
   // After user login/signup
   analytics.identify(userId, {
     email: userEmail,
   });
   ```

### Email Not Captured (General)

- Verify `identify()` is called with email property
- Check browser localStorage for `mentiq_user_email`
- Ensure user has not blocked localStorage
- Check that cookies are enabled (for cookie-based detection)

### At-Risk Users Not Showing

- Verify database migration has been run
- Check that events have been ingested with channel/email data
- Ensure sufficient time has passed (at-risk window is 3-14 days)

---

## Support

For questions or issues:

- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-site]
- Email: support@mentiq.com
