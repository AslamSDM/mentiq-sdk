// Example usage with Next.js App Router
import { AnalyticsProvider, useAnalytics, TrackView, HeatmapTracker } from 'mentiq-sdk';

// 1. Wrap your app with the provider
export default function Layout({ children }) {
return (
<html>
<body>
<AnalyticsProvider
config={{
            apiKey: 'your-api-key',
            enableHeatmapTracking: true,
            enableSessionRecording: true,
            enableErrorTracking: true,
            batchSize: 10,
            flushInterval: 5000,
          }} >
{children}
</AnalyticsProvider>
</body>
</html>
);
}

// 2. Track events in components
function ProductPage({ product }) {
const { track, getSessionData } = useAnalytics();

return (
<div>
{/_ Track element visibility _/}
<TrackView
event="product_viewed"
properties={{
          product_id: product.id,
          category: product.category
        }} >
<h1>{product.name}</h1>
</TrackView>

      {/* Track interactions for heatmap */}
      <HeatmapTracker
        trackClicks={true}
        trackHovers={true}
        element="product-actions"
      >
        <button
          onClick={() => track('add_to_cart', { product_id: product.id })}
        >
          Add to Cart
        </button>
      </HeatmapTracker>
    </div>

);
}

// 3. Track custom events
function ContactForm() {
const { track, trackError } = useAnalytics();

const handleSubmit = async (data) => {
try {
await submitForm(data);
track('form_submitted', { form_type: 'contact' });
} catch (error) {
trackError(error, { form_type: 'contact' });
}
};

return (
<form onSubmit={handleSubmit}>
<input name="email" type="email" />
<button type="submit">Submit</button>
</form>
);
}
