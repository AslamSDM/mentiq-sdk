// Onboarding Tracking Helper

import { Analytics } from "./analytics";

export interface OnboardingStep {
  name: string;
  index: number;
  required?: boolean;
}

export interface OnboardingConfig {
  steps: OnboardingStep[];
  autoTrack?: boolean;
}

export class OnboardingTracker {
  private analytics: Analytics;
  private config: OnboardingConfig;
  private currentStepIndex: number = -1;
  private startTime: Date | null = null;
  private completedSteps: Set<string> = new Set();

  constructor(analytics: Analytics, config: OnboardingConfig) {
    this.analytics = analytics;
    this.config = config;
  }

  /**
   * Start the onboarding process
   */
  public start(properties?: Record<string, any>): void {
    this.startTime = new Date();
    this.currentStepIndex = -1;
    this.completedSteps.clear();

    this.analytics.track("onboarding_started", {
      total_steps: this.config.steps.length,
      ...properties,
    });
  }

  /**
   * Complete a step in the onboarding process
   */
  public completeStep(
    stepName: string,
    properties?: Record<string, any>
  ): void {
    const step = this.config.steps.find((s) => s.name === stepName);
    if (!step) {
      console.warn(`OnboardingTracker: Step "${stepName}" not found in config`);
      return;
    }

    this.completedSteps.add(stepName);
    this.currentStepIndex = step.index;

    this.analytics.track("onboarding_step_completed", {
      step_name: stepName,
      step_index: step.index,
      required: step.required || false,
      steps_completed: this.completedSteps.size,
      total_steps: this.config.steps.length,
      progress: (this.completedSteps.size / this.config.steps.length) * 100,
      time_since_start: this.startTime
        ? Date.now() - this.startTime.getTime()
        : null,
      ...properties,
    });

    // Check if all steps are completed
    if (this.completedSteps.size === this.config.steps.length) {
      this.complete();
    }
  }

  /**
   * Skip a step (optional steps only)
   */
  public skipStep(stepName: string, reason?: string): void {
    const step = this.config.steps.find((s) => s.name === stepName);
    if (!step) {
      console.warn(`OnboardingTracker: Step "${stepName}" not found in config`);
      return;
    }

    if (step.required) {
      console.warn(
        `OnboardingTracker: Cannot skip required step "${stepName}"`
      );
      return;
    }

    this.analytics.track("onboarding_step_skipped", {
      step_name: stepName,
      step_index: step.index,
      reason: reason || "not_specified",
      steps_completed: this.completedSteps.size,
      total_steps: this.config.steps.length,
    });
  }

  /**
   * Mark onboarding as complete
   */
  public complete(properties?: Record<string, any>): void {
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    this.analytics.track("onboarding_completed", {
      steps_completed: this.completedSteps.size,
      total_steps: this.config.steps.length,
      completion_rate:
        (this.completedSteps.size / this.config.steps.length) * 100,
      duration_ms: duration,
      duration_seconds: Math.floor(duration / 1000),
      ...properties,
    });
  }

  /**
   * Abandon onboarding
   */
  public abandon(reason?: string): void {
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    this.analytics.track("onboarding_abandoned", {
      step_name: this.getCurrentStepName(),
      step_index: this.currentStepIndex,
      steps_completed: this.completedSteps.size,
      total_steps: this.config.steps.length,
      progress: (this.completedSteps.size / this.config.steps.length) * 100,
      duration_ms: duration,
      reason: reason || "not_specified",
    });
  }

  /**
   * Get current progress
   */
  public getProgress(): {
    currentStep: string | null;
    currentStepIndex: number;
    completedSteps: string[];
    totalSteps: number;
    progressPercent: number;
    duration: number | null;
  } {
    return {
      currentStep: this.getCurrentStepName(),
      currentStepIndex: this.currentStepIndex,
      completedSteps: Array.from(this.completedSteps),
      totalSteps: this.config.steps.length,
      progressPercent:
        (this.completedSteps.size / this.config.steps.length) * 100,
      duration: this.startTime ? Date.now() - this.startTime.getTime() : null,
    };
  }

  /**
   * Check if a step is completed
   */
  public isStepCompleted(stepName: string): boolean {
    return this.completedSteps.has(stepName);
  }

  /**
   * Get current step name
   */
  private getCurrentStepName(): string | null {
    if (
      this.currentStepIndex < 0 ||
      this.currentStepIndex >= this.config.steps.length
    ) {
      return null;
    }
    return this.config.steps[this.currentStepIndex].name;
  }

  /**
   * Reset the tracker
   */
  public reset(): void {
    this.currentStepIndex = -1;
    this.startTime = null;
    this.completedSteps.clear();
  }
}

// React Hook for Onboarding Tracking
export function useOnboardingTracker(
  analytics: Analytics | null,
  config: OnboardingConfig
): OnboardingTracker | null {
  if (!analytics) return null;
  return new OnboardingTracker(analytics, config);
}
