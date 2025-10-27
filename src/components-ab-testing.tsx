import React, { ReactNode, useEffect, useState } from 'react';
import { 
  ExperimentAssignment, 
  ConversionEvent,
  AssignmentOptions 
} from './types';
import { useExperiment, useVariant, useVariantValue, useConversionTracking } from './hooks-ab-testing';

// Main A/B Test component that renders different content based on variant
interface ABTestProps {
  experimentKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  options?: AssignmentOptions;
}

export function ABTest({ experimentKey, children, fallback, loadingComponent, options }: ABTestProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  if (error || !assignment) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Variant component to render content for specific variants
interface VariantProps {
  experimentKey: string;
  variantKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  options?: AssignmentOptions;
}

export function Variant({ experimentKey, variantKey, children, fallback, options }: VariantProps) {
  const { isEnabled, loading, error } = useVariant(experimentKey, variantKey);

  if (loading) {
    return null;
  }

  if (error || !isEnabled) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Control variant component (shortcut for isControl=true)
interface ControlProps {
  experimentKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  options?: AssignmentOptions;
}

export function Control({ experimentKey, children, fallback, options }: ControlProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return null;
  }

  if (error || !assignment?.isControl) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Multiple variants component for cleaner syntax
interface VariantsProps {
  experimentKey: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  options?: AssignmentOptions;
}

export function Variants({ experimentKey, variants, fallback, loadingComponent, options }: VariantsProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  if (error || !assignment) {
    return <>{fallback || null}</>;
  }

  const variantContent = variants[assignment.variantKey];
  return <>{variantContent || fallback || null}</>;
}

// Feature flag component
interface FeatureFlagProps {
  experimentKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  options?: AssignmentOptions;
}

export function FeatureFlag({ experimentKey, children, fallback, loadingComponent, options }: FeatureFlagProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  // Show feature if user is in any variant (not control)
  if (error || !assignment || assignment.isControl) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Component for A/B testing different values
interface ABTestValueProps<T> {
  experimentKey: string;
  controlValue: T;
  variantValues: Record<string, T>;
  children: (value: T, variant: string | undefined, isControl: boolean) => ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  options?: AssignmentOptions;
}

export function ABTestValue<T>({ 
  experimentKey, 
  controlValue, 
  variantValues, 
  children, 
  fallback, 
  loadingComponent,
  options 
}: ABTestValueProps<T>) {
  const { value, loading, error, variant, isControl } = useVariantValue(experimentKey, controlValue, variantValues);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  if (error) {
    return <>{fallback || null}</>;
  }

  return <>{children(value, variant, isControl)}</>;
}

// Higher-order component for A/B testing
export function withABTest<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  experimentKey: string,
  options?: AssignmentOptions
) {
  return function ABTestWrapper(props: P) {
    const { assignment, loading, error } = useExperiment(experimentKey, options);

    if (loading) {
      return null; // or loading component
    }

    if (error || !assignment) {
      return <WrappedComponent {...props} abTestVariant={null} abTestAssignment={null} />;
    }

    return (
      <WrappedComponent 
        {...props} 
        abTestVariant={assignment.variantKey}
        abTestAssignment={assignment}
      />
    );
  };
}

// Conversion tracking component
interface ConversionTrackerProps {
  experimentId: string;
  eventName: string;
  eventValue?: number;
  properties?: Record<string, any>;
  children?: ReactNode;
  triggerOnMount?: boolean;
}

export function ConversionTracker({ 
  experimentId, 
  eventName, 
  eventValue, 
  properties, 
  children,
  triggerOnMount = false 
}: ConversionTrackerProps) {
  const { trackConversion } = useConversionTracking();
  const [tracked, setTracked] = useState(false);

  const track = () => {
    if (!tracked) {
      trackConversion({
        experimentId,
        eventName,
        eventValue,
        properties,
      });
      setTracked(true);
    }
  };

  useEffect(() => {
    if (triggerOnMount) {
      track();
    }
  }, [triggerOnMount]);

  if (children) {
    return (
      <div onClick={track} style={{ cursor: 'pointer' }}>
        {children}
      </div>
    );
  }

  return null;
}

// Hook-based component for conditional rendering
interface ABTestConditionalProps {
  experimentKey: string;
  condition: (assignment: ExperimentAssignment) => boolean;
  children: ReactNode;
  fallback?: ReactNode;
  options?: AssignmentOptions;
}

export function ABTestConditional({ 
  experimentKey, 
  condition, 
  children, 
  fallback, 
  options 
}: ABTestConditionalProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return null;
  }

  if (error || !assignment || !condition(assignment)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

// Component for running variant-specific effects
interface ABTestEffectProps {
  experimentKey: string;
  effects: Record<string, () => void | (() => void)>;
  options?: AssignmentOptions;
}

export function ABTestEffect({ experimentKey, effects, options }: ABTestEffectProps) {
  const { assignment } = useExperiment(experimentKey, options);

  useEffect(() => {
    if (assignment && effects[assignment.variantKey]) {
      const cleanup = effects[assignment.variantKey]();
      return cleanup;
    }
  }, [assignment, effects]);

  return null;
}

// Component for A/B testing with loading and error states
interface ABTestWithStatesProps {
  experimentKey: string;
  children: (assignment: ExperimentAssignment) => ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: string) => ReactNode;
  fallbackComponent?: ReactNode;
  options?: AssignmentOptions;
}

export function ABTestWithStates({ 
  experimentKey, 
  children, 
  loadingComponent, 
  errorComponent, 
  fallbackComponent, 
  options 
}: ABTestWithStatesProps) {
  const { assignment, loading, error } = useExperiment(experimentKey, options);

  if (loading) {
    return <>{loadingComponent || null}</>;
  }

  if (error) {
    return <>{errorComponent ? errorComponent(error) : null}</>;
  }

  if (!assignment) {
    return <>{fallbackComponent || null}</>;
  }

  return <>{children(assignment)}</>;
}

// Example usage components for common patterns

// Button A/B test component
interface ABTestButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  experimentKey: string;
  variants: Record<string, { text: string; style?: React.CSSProperties }>;
  onClick?: () => void;
  onConversion?: () => void;
}

export function ABTestButton({ 
  experimentKey, 
  variants, 
  onClick, 
  onConversion, 
  ...props 
}: ABTestButtonProps) {
  const { assignment } = useExperiment(experimentKey);
  const { trackConversion } = useConversionTracking();

  if (!assignment) {
    return null;
  }

  const variant = variants[assignment.variantKey];
  if (!variant) {
    return null;
  }

  const handleClick = () => {
    onClick?.();
    onConversion?.();
    
    // Track conversion if experiment ID is available
    if (assignment.experiment?.id) {
      trackConversion({
        experimentId: assignment.experiment.id,
        eventName: 'button_click',
        properties: {
          variant: assignment.variantKey,
          buttonText: variant.text,
        },
      });
    }
  };

  return (
    <button 
      onClick={handleClick} 
      style={variant.style}
      {...props}
    >
      {variant.text}
    </button>
  );
}

// Text A/B test component
interface ABTestTextProps {
  experimentKey: string;
  variants: Record<string, string>;
  fallback?: string;
  component?: React.ComponentType<{ children: string }>;
  options?: AssignmentOptions;
}

export function ABTestText({ experimentKey, variants, fallback, component: Component = 'span', options }: ABTestTextProps) {
  const { value, loading } = useVariantValue(experimentKey, fallback || '', variants);

  if (loading) {
    return <Component>{fallback || ''}</Component>;
  }

  return <Component>{value}</Component>;
}