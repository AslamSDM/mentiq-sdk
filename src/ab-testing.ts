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
      Authorization: `ApiKey ${this.config.apiKey}`,
      "X-Project-ID": this.config.projectId,
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
      const response = await fetch(
        `${this.apiEndpoint}/projects/${this.config.projectId}/experiments`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

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
