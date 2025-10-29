import { useState, useEffect, useCallback, useContext } from "react";
import {
  ExperimentAssignment,
  ConversionEvent,
  AssignmentOptions,
  EventProperties,
  Experiment,
} from "./types";
import { AnalyticsContext } from "./provider";
import { ABTesting } from "./ab-testing";

export function useABTesting() {
  const analytics = useContext(AnalyticsContext);

  if (!analytics) {
    throw new Error("useABTesting must be used within an AnalyticsProvider");
  }
  if (!analytics.config.enableABTesting) {
    return null;
  }

  // This is a simplified way to get the ABTesting instance.
  // In a real app, you might want to manage this instance more carefully.
  return new ABTesting(analytics.config);
}

export function useExperiment(
  experimentKey: string,
  options?: AssignmentOptions
) {
  const abTesting = useABTesting();
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!abTesting) {
      setLoading(false);
      return;
    }

    abTesting
      .getAssignment(experimentKey, options)
      .then((ass) => {
        setAssignment(ass);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [abTesting, experimentKey, options]);

  const trackConversion = useCallback(
    (eventName: string, eventValue?: number, properties?: EventProperties) => {
      if (abTesting && assignment) {
        const conversion: ConversionEvent = {
          experimentId: assignment.experimentId,
          eventName,
          eventValue,
          properties,
        };
        abTesting.trackConversion(conversion);
      }
    },
    [abTesting, assignment]
  );

  return {
    loading,
    error,
    assignment,
    variantKey: assignment?.variantKey,
    trackConversion,
  };
}

// // Hook to get multiple experiment assignments
// export function useExperiments(experimentKeys: string[]) {
//   const abTestService = useABTesting();
//   const [assignments, setAssignments] = useState<
//     Record<string, ExperimentAssignment | null>
//   >({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchAssignments = useCallback(async () => {
//     if (!abTestService) {
//       setLoading(false);
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);
//       const results = await abTestService.getExperiment(
//         experimentKeys
//       );
//       setAssignments(results);
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to get assignments"
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, [abTestService, experimentKeys]);

//   useEffect(() => {
//     fetchAssignments();
//   }, [fetchAssignments]);

//   const refetch = useCallback(() => {
//     fetchAssignments();
//   }, [fetchAssignments]);

//   return {
//     assignments,
//     loading,
//     error,
//     refetch,
//     getVariant: (key: string) => assignments[key]?.variantKey,
//     isControl: (key: string) => assignments[key]?.isControl,
//     isInExperiment: (key: string) => !!assignments[key],
//   };
// }

// Hook to check if a specific variant is enabled
export function useVariant(experimentKey: string, variantKey: string) {
  const { assignment, loading, error } = useExperiment(experimentKey);
  const isEnabled = assignment?.variantKey === variantKey;

  return {
    isEnabled,
    loading,
    error,
    assignment,
  };
}

// Hook to get variant value (for feature flags)
export function useVariantValue<T>(
  experimentKey: string,
  controlValue: T,
  variantValues: Record<string, T>
) {
  const { assignment, loading, error } = useExperiment(experimentKey);
  const [value, setValue] = useState<T>(controlValue);

  useEffect(() => {
    if (assignment && variantValues[assignment.variantKey] !== undefined) {
      setValue(variantValues[assignment.variantKey]);
    } else {
      setValue(controlValue);
    }
  }, [assignment, controlValue, variantValues]);

  return {
    value,
    loading,
    error,
    variant: assignment?.variantKey,
    isControl: assignment?.isControl,
  };
}

// Hook for running variant-specific code
export function useVariantRunner(
  experimentKey: string,
  functions: Record<string, () => void>
) {
  const { assignment, loading } = useExperiment(experimentKey);

  useEffect(() => {
    if (assignment && functions[assignment.variantKey]) {
      functions[assignment.variantKey]();
    }
  }, [assignment, functions]);

  return {
    loading,
    variant: assignment?.variantKey,
    isControl: assignment?.isControl,
  };
}

// Hook for conversion tracking
export function useConversionTracking() {
  const abTestService = useABTesting();

  const trackConversion = useCallback(
    async (conversion: ConversionEvent) => {
      if (!abTestService) {
        console.warn("A/B testing service not available");
        return;
      }

      try {
        await abTestService.trackConversion(conversion);
      } catch (error) {
        console.error("Failed to track conversion:", error);
      }
    },
    [abTestService]
  );

  return {
    trackConversion,
  };
}

// Hook for getting all active experiments
export function useActiveExperiments() {
  const abTestService = useABTesting();
  const [activeVariants, setActiveVariants] = useState<
    Record<string, ExperimentAssignment>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveVariants = useCallback(async () => {
    if (!abTestService) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const variants = await abTestService.getActiveVariants();
      setActiveVariants(variants);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get active variants"
      );
    } finally {
      setLoading(false);
    }
  }, [abTestService]);

  useEffect(() => {
    fetchActiveVariants();
  }, [fetchActiveVariants]);

  const refetch = useCallback(() => {
    fetchActiveVariants();
  }, [fetchActiveVariants]);

  return {
    activeVariants,
    loading,
    error,
    refetch,
    count: Object.keys(activeVariants).length,
  };
}

// Hook for experiment information
export function useExperimentInfo(experimentKey: string) {
  const abTestService = useABTesting();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiment = useCallback(async () => {
    if (!abTestService) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await abTestService.getExperiment(experimentKey);
      setExperiment(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get experiment");
    } finally {
      setLoading(false);
    }
  }, [abTestService, experimentKey]);

  useEffect(() => {
    fetchExperiment();
  }, [fetchExperiment]);

  const refetch = useCallback(() => {
    fetchExperiment();
  }, [fetchExperiment]);

  return {
    experiment,
    loading,
    error,
    refetch,
    isRunning: experiment?.status === "RUNNING",
    variants: experiment?.variants || [],
  };
}

// Utility hook for A/B testing with loading states
export function useABTestWithFallback<T>(
  experimentKey: string,
  controlValue: T,
  variantValues: Record<string, T>,
  fallbackValue?: T
) {
  const { value, loading, error } = useVariantValue(
    experimentKey,
    controlValue,
    variantValues
  );

  const finalValue =
    error && fallbackValue !== undefined ? fallbackValue : value;

  return {
    value: finalValue,
    loading,
    error,
    hasError: !!error,
    isUsingFallback: error && fallbackValue !== undefined,
  };
}
