import {
  AnalyticsConfig,
  Experiment,
  ExperimentAssignment,
  ConversionEvent,
  AssignmentOptions,
  ABTestAnalytics,
} from "./types";
import { getUserId, getAnonymousId } from "./utils";

export class ABTesting implements ABTestAnalytics {
  private config: AnalyticsConfig;
  private headers: { [key: string]: string };

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  private get apiEndpoint(): string {
    return `${this.config.endpoint || "http://localhost:8080"}/api/v1`;
  }

  async getAssignment(
    experimentKey: string,
    options?: AssignmentOptions
  ): Promise<ExperimentAssignment | null> {
    const userIdentifiers = {
      userId: options?.userId || getUserId(),
      anonymousId: options?.anonymousId || getAnonymousId(),
    };

    try {
      const response = await fetch(
        `${this.apiEndpoint}/experiments/${experimentKey}/assignment`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify(userIdentifiers),
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to get assignment for experiment ${experimentKey}: ${response.statusText}`
        );
        return null;
      }

      const assignment = await response.json();
      if (assignment.included === false) {
        return null;
      }
      return assignment;
    } catch (error) {
      console.error(
        `Error getting assignment for experiment ${experimentKey}:`,
        error
      );
      return null;
    }
  }

  async trackConversion(conversion: ConversionEvent): Promise<void> {
    const userIdentifiers = {
      userId: getUserId(),
      anonymousId: getAnonymousId(),
    };

    try {
      const response = await fetch(`${this.apiEndpoint}/experiments/track`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ ...conversion, ...userIdentifiers }),
      });

      if (!response.ok) {
        console.error(
          `Failed to track conversion for experiment ${conversion.experimentId}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error(
        `Error tracking conversion for experiment ${conversion.experimentId}:`,
        error
      );
    }
  }

  async getAllExperiments(): Promise<Experiment[]> {
    try {
      const response = await fetch(`${this.apiEndpoint}/experiments`, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        console.error(`Failed to get all experiments: ${response.statusText}`);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting all experiments:", error);
      return [];
    }
  }

  async getExperiment(experimentKey: string): Promise<Experiment | null> {
    const experiments = await this.getAllExperiments();
    return (
      experiments.find((exp: Experiment) => exp.key === experimentKey) || null
    );
  }

  async isVariantEnabled(
    experimentKey: string,
    variantKey: string
  ): Promise<boolean> {
    const assignment = await this.getAssignment(experimentKey);
    return assignment?.variantKey === variantKey;
  }

  async getActiveVariants(): Promise<Record<string, ExperimentAssignment>> {
    console.warn("getActiveVariants is not implemented efficiently yet.");
    return {};
  }
}
  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.endpoint = config.endpoint || 'https://api.mentiq.io';
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.context = {
      assignments: {},
      experiments: {},
      lastFetch: 0,
    };
    this.cache = new Map();
    
    // Merge with default config
    this.config.abTestConfig = { ...this.defaultConfig, ...config.abTestConfig };
  }

  async getExperiment(experimentKey: string): Promise<Experiment | null> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/experiments/${experimentKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'X-Project-ID': this.projectId,
        },
      });

      if (!response.ok) {
        if (this.config.debug) {
          console.warn(`Failed to fetch experiment ${experimentKey}:`, response.statusText);
        }
        return null;
      }

      const experiment: Experiment = await response.json();
      this.context.experiments[experimentKey] = experiment;
      return experiment;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Error fetching experiment ${experimentKey}:`, error);
      }
      return null;
    }
  }

  async getAssignment(
    experimentKey: string, 
    options: AssignmentOptions = {}
  ): Promise<ExperimentAssignment | null> {
    const cacheKey = `${experimentKey}:${options.userId || 'anonymous'}:${options.anonymousId || 'anonymous'}`;
    
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.config.abTestConfig?.assignmentCacheTTL || 300000)) {
        return cached.assignment;
      }
    }

    try {
      const userId = options.userId || this.config.userId;
      const anonymousId = options.anonymousId || this.generateAnonymousId();

      const response = await fetch(`${this.endpoint}/api/v1/ab-testing/${experimentKey}/assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'X-Project-ID': this.projectId,
        },
        body: JSON.stringify({
          userId,
          anonymousId,
        }),
      });

      if (!response.ok) {
        if (this.config.debug) {
          console.warn(`Failed to get assignment for experiment ${experimentKey}:`, response.statusText);
        }
        return null;
      }

      const assignment: ExperimentAssignment = await response.json();
      
      // Cache the assignment
      this.cache.set(cacheKey, {
        assignment,
        timestamp: Date.now(),
      });

      // Store in context
      this.context.assignments[experimentKey] = assignment;

      // Auto-track exposure if enabled
      if (this.config.abTestConfig?.autoTrackExposures) {
        this.trackExposure(experimentKey, assignment);
      }

      return assignment;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Error getting assignment for experiment ${experimentKey}:`, error);
      }
      return null;
    }
  }

  async trackConversion(conversion: ConversionEvent): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/ab-testing/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'X-Project-ID': this.projectId,
        },
        body: JSON.stringify({
          experimentId: conversion.experimentId,
          eventName: conversion.eventName,
          eventValue: conversion.eventValue,
          properties: conversion.properties,
          userId: this.config.userId,
          anonymousId: this.generateAnonymousId(),
        }),
      });

      if (!response.ok) {
        if (this.config.debug) {
          console.warn(`Failed to track conversion:`, response.statusText);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`Error tracking conversion:`, error);
      }
    }
  }

  async getAllExperiments(): Promise<Experiment[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/experiments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'X-Project-ID': this.projectId,
        },
      });

      if (!response.ok) {
        if (this.config.debug) {
          console.warn(`Failed to fetch experiments:`, response.statusText);
        }
        return [];
      }

      const experiments: Experiment[] = await response.json();
      
      // Update context
      experiments.forEach(exp => {
        this.context.experiments[exp.key] = exp;
      });

      return experiments;
    } catch (error) {
      if (this.config.debug) {
        console.error(`Error fetching experiments:`, error);
      }
      return [];
    }
  }

  async isVariantEnabled(experimentKey: string, variantKey: string): Promise<boolean> {
    const assignment = await this.getAssignment(experimentKey);
    return assignment?.variantKey === variantKey;
  }

  async getActiveVariants(): Promise<Record<string, ExperimentAssignment>> {
    // Get all running experiments
    const experiments = await this.getAllExperiments();
    const runningExperiments = experiments.filter(exp => exp.status === 'RUNNING');
    
    const activeVariants: Record<string, ExperimentAssignment> = {};
    
    for (const experiment of runningExperiments) {
      const assignment = await this.getAssignment(experiment.key);
      if (assignment) {
        activeVariants[experiment.key] = assignment;
      }
    }

    return activeVariants;
  }

  // Helper methods
  private generateAnonymousId(): string {
    // Generate or retrieve anonymous ID from localStorage
    let anonymousId = localStorage.getItem('mentiq_anonymous_id');
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('mentiq_anonymous_id', anonymousId);
    }
    return anonymousId;
  }

  private async trackExposure(experimentKey: string, assignment: ExperimentAssignment): Promise<void> {
    // This would integrate with the main analytics tracking
    // For now, we'll just log it
    if (this.config.debug) {
      console.log(`A/B Test Exposure: ${experimentKey} -> ${assignment.variantKey}`, assignment);
    }
    
    // TODO: Integrate with main analytics.track() when available
    // analytics.track('ab_test_exposed', {
    //   experimentKey,
    //   variantKey: assignment.variantKey,
    //   variantName: assignment.variantName,
    //   isControl: assignment.isControl,
    //   experimentId: assignment.experimentId,
    //   variantId: assignment.variantId,
    // });
  }

  // Utility methods for common A/B testing patterns
  async getVariantValue<T>(
    experimentKey: string, 
    controlValue: T, 
    variantValues: Record<string, T>
  ): Promise<T> {
    const assignment = await this.getAssignment(experimentKey);
    if (!assignment) {
      return controlValue;
    }

    return variantValues[assignment.variantKey] || controlValue;
  }

  async runVariantFunction(
    experimentKey: string,
    functions: Record<string, () => void>
  ): Promise<void> {
    const assignment = await this.getAssignment(experimentKey);
    if (!assignment) {
      return;
    }

    const fn = functions[assignment.variantKey];
    if (fn) {
      fn();
    }
  }

  // Context management
  getContext(): ABTestContext {
    return { ...this.context };
  }

  clearCache(): void {
    this.cache.clear();
    this.context = {
      assignments: {},
      experiments: {},
      lastFetch: 0,
    };
  }

  // Batch operations
  async getMultipleAssignments(experimentKeys: string[]): Promise<Record<string, ExperimentAssignment | null>> {
    const assignments: Record<string, ExperimentAssignment | null> = {};
    
    await Promise.all(
      experimentKeys.map(async (key) => {
        assignments[key] = await this.getAssignment(key);
      })
    );

    return assignments;
  }
}