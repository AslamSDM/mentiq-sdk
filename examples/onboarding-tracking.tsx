/**
 * Onboarding Tracking Examples
 *
 * This file demonstrates how to track user onboarding flows using the OnboardingTracker helper.
 *
 * ⚠️ IMPORTANT: OnboardingTracker is NOT automatic!
 * You must manually call tracker methods when users complete steps.
 * The tracker formats and sends events that the backend analyzes.
 */

import React, { useEffect, useState } from "react";
import {
  Analytics,
  OnboardingTracker,
  useOnboardingTracker,
  useMentiqAnalytics,
} from "mentiq-sdk";

// ============================================================================
// Example 1: Basic Onboarding Flow
// ============================================================================

export function BasicOnboardingExample() {
  const analytics = useMentiqAnalytics();
  const [currentStep, setCurrentStep] = useState(0);

  // Define your onboarding steps
  const onboardingConfig = {
    steps: [
      { name: "account_created", index: 0, required: true },
      { name: "profile_completed", index: 1, required: true },
      { name: "preferences_set", index: 2, required: false },
      { name: "first_action", index: 3, required: true },
    ],
  };

  // Create tracker instance
  const tracker = useOnboardingTracker(analytics, onboardingConfig);

  // Start onboarding when component mounts
  useEffect(() => {
    tracker?.start({
      signup_method: "email",
      referral_source: "organic",
    });
  }, []);

  const handleAccountCreated = async () => {
    // Your account creation logic
    await createAccount();

    // ✅ Manually track step completion
    tracker?.completeStep("account_created", {
      account_type: "free",
      email_verified: false,
    });

    setCurrentStep(1);
  };

  const handleProfileCompleted = async () => {
    await saveProfile();

    tracker?.completeStep("profile_completed", {
      fields_completed: ["name", "company", "role"],
    });

    setCurrentStep(2);
  };

  const handleSkipPreferences = () => {
    // Skip optional step
    tracker?.skipStep("preferences_set", "user_wants_to_explore");
    setCurrentStep(3);
  };

  const handleFirstAction = async () => {
    await performAction();

    tracker?.completeStep("first_action", {
      action_type: "create_project",
    });

    // Onboarding will auto-complete when all required steps are done
  };

  const progress = tracker?.getProgress();

  return (
    <div>
      <h2>Onboarding Progress: {progress?.progressPercent}%</h2>

      {currentStep === 0 && (
        <button onClick={handleAccountCreated}>Create Account</button>
      )}

      {currentStep === 1 && (
        <button onClick={handleProfileCompleted}>Complete Profile</button>
      )}

      {currentStep === 2 && (
        <div>
          <button onClick={() => tracker?.completeStep("preferences_set")}>
            Set Preferences
          </button>
          <button onClick={handleSkipPreferences}>Skip</button>
        </div>
      )}

      {currentStep === 3 && (
        <button onClick={handleFirstAction}>Create First Project</button>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Multi-Step Form with Onboarding
// ============================================================================

export function MultiStepFormOnboarding() {
  const analytics = useMentiqAnalytics();
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    role: "",
  });

  const onboardingConfig = {
    steps: [
      { name: "email_entered", index: 0, required: true },
      { name: "personal_info", index: 1, required: true },
      { name: "company_info", index: 2, required: true },
      { name: "role_selected", index: 3, required: true },
      { name: "onboarding_complete", index: 4, required: true },
    ],
  };

  const tracker = new OnboardingTracker(analytics!, onboardingConfig);

  useEffect(() => {
    tracker.start({
      form_type: "multi_step",
      source: "signup_page",
    });
  }, []);

  const handleEmailSubmit = (email: string) => {
    setFormData({ ...formData, email });

    tracker.completeStep("email_entered", {
      email_domain: email.split("@")[1],
      time_to_complete_ms: Date.now() - startTime,
    });
  };

  const handlePersonalInfo = (name: string) => {
    setFormData({ ...formData, name });

    tracker.completeStep("personal_info", {
      has_name: !!name,
    });
  };

  const handleCompanyInfo = (company: string) => {
    setFormData({ ...formData, company });

    tracker.completeStep("company_info", {
      company_provided: !!company,
    });
  };

  const handleRoleSelect = (role: string) => {
    setFormData({ ...formData, role });

    tracker.completeStep("role_selected", {
      role: role,
    });
  };

  const handleFormComplete = async () => {
    await submitForm(formData);

    tracker.completeStep("onboarding_complete", {
      total_time_seconds: (Date.now() - startTime) / 1000,
      all_fields_completed: true,
    });
  };

  return <form>{/* Your form UI */}</form>;
}

// ============================================================================
// Example 3: Product Tour / Interactive Tutorial
// ============================================================================

export function ProductTourOnboarding() {
  const analytics = useMentiqAnalytics();
  const [tourStep, setTourStep] = useState(0);

  const tourConfig = {
    steps: [
      { name: "tour_started", index: 0, required: true },
      { name: "viewed_dashboard", index: 1, required: true },
      { name: "created_first_item", index: 2, required: true },
      { name: "viewed_analytics", index: 3, required: false },
      { name: "invited_team", index: 4, required: false },
      { name: "tour_completed", index: 5, required: true },
    ],
  };

  const tracker = useOnboardingTracker(analytics, tourConfig);

  const startTour = () => {
    tracker?.start({
      tour_version: "v2",
      user_requested: true,
    });
    setTourStep(1);
  };

  const viewDashboard = () => {
    tracker?.completeStep("viewed_dashboard", {
      time_spent_seconds: 10,
    });
    setTourStep(2);
  };

  const createItem = () => {
    tracker?.completeStep("created_first_item", {
      item_type: "project",
    });
    setTourStep(3);
  };

  const skipAnalytics = () => {
    tracker?.skipStep("viewed_analytics", "not_interested");
    setTourStep(4);
  };

  const exitTour = () => {
    tracker?.abandon("user_quit_early");
  };

  const finishTour = () => {
    tracker?.complete({
      completed_optional_steps: 0,
      user_feedback: "helpful",
    });
  };

  return (
    <div>
      <h2>Product Tour - Step {tourStep} of 6</h2>
      {tourStep === 0 && <button onClick={startTour}>Start Tour</button>}
      {tourStep === 1 && (
        <button onClick={viewDashboard}>View Dashboard</button>
      )}
      {tourStep === 2 && <button onClick={createItem}>Create Item</button>}
      <button onClick={exitTour}>Exit Tour</button>
    </div>
  );
}

// ============================================================================
// Example 4: SaaS Onboarding with Conditional Steps
// ============================================================================

export function SaaSOnboarding() {
  const analytics = useMentiqAnalytics();
  const [userTier, setUserTier] = useState<"free" | "pro" | "enterprise">(
    "free"
  );

  const getOnboardingConfig = (tier: string) => ({
    steps: [
      { name: "account_created", index: 0, required: true },
      { name: "team_created", index: 1, required: tier !== "free" },
      { name: "billing_setup", index: 2, required: tier === "enterprise" },
      { name: "first_project", index: 3, required: true },
      { name: "api_key_generated", index: 4, required: tier !== "free" },
      { name: "integration_setup", index: 5, required: false },
    ],
  });

  const tracker = useOnboardingTracker(
    analytics,
    getOnboardingConfig(userTier)
  );

  useEffect(() => {
    tracker?.start({
      user_tier: userTier,
      signup_date: new Date().toISOString(),
    });
  }, [userTier]);

  const handleAccountCreated = (tier: "free" | "pro" | "enterprise") => {
    setUserTier(tier);

    tracker?.completeStep("account_created", {
      selected_tier: tier,
    });
  };

  const handleTeamCreated = () => {
    if (userTier !== "free") {
      tracker?.completeStep("team_created", {
        team_size: 5,
      });
    }
  };

  const handleBillingSetup = () => {
    if (userTier === "enterprise") {
      tracker?.completeStep("billing_setup", {
        payment_method: "invoice",
      });
    }
  };

  return <div>{/* Your onboarding UI */}</div>;
}

// ============================================================================
// Example 5: Monitoring Onboarding Progress
// ============================================================================

export function OnboardingProgressMonitor() {
  const analytics = useMentiqAnalytics();
  const [showProgress, setShowProgress] = useState(true);

  const config = {
    steps: [
      { name: "step1", index: 0, required: true },
      { name: "step2", index: 1, required: true },
      { name: "step3", index: 2, required: false },
      { name: "step4", index: 3, required: true },
    ],
  };

  const tracker = useOnboardingTracker(analytics, config);
  const progress = tracker?.getProgress();

  return (
    <div>
      {showProgress && (
        <div className="onboarding-progress-bar">
          <div className="progress-header">
            <h3>Complete your setup</h3>
            <button onClick={() => setShowProgress(false)}>×</button>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress?.progressPercent || 0}%` }}
            />
          </div>

          <div className="progress-stats">
            <p>
              {progress?.completedSteps.length} of {progress?.totalSteps}{" "}
              completed
            </p>
            <p>Current: {progress?.currentStep || "Not started"}</p>
          </div>

          <div className="steps-list">
            {config.steps.map((step) => (
              <div key={step.name} className="step-item">
                <input
                  type="checkbox"
                  checked={progress?.completedSteps.includes(step.name)}
                  readOnly
                />
                <span>{step.name.replace(/_/g, " ")}</span>
                {!step.required && <span className="badge">Optional</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 6: Vanilla JavaScript (No React)
// ============================================================================

export function vanillaJavaScriptExample() {
  // Initialize analytics
  const analytics = new Analytics({
    apiKey: "your-api-key",
    projectId: "your-project-id",
  });

  // Setup onboarding tracker
  const onboardingConfig = {
    steps: [
      { name: "registration", index: 0, required: true },
      { name: "email_verify", index: 1, required: true },
      { name: "profile_setup", index: 2, required: true },
    ],
  };

  const tracker = new OnboardingTracker(analytics, onboardingConfig);

  // Start onboarding
  tracker.start();

  // Track step completion
  document
    .getElementById("register-btn")
    ?.addEventListener("click", async () => {
      await registerUser();
      tracker.completeStep("registration", {
        method: "email",
      });
    });

  document.getElementById("verify-btn")?.addEventListener("click", async () => {
    await verifyEmail();
    tracker.completeStep("email_verify");
  });

  document
    .getElementById("profile-btn")
    ?.addEventListener("click", async () => {
      await setupProfile();
      tracker.completeStep("profile_setup");
      // Auto-completes when all steps done
    });

  // Handle abandonment
  document.getElementById("exit-btn")?.addEventListener("click", () => {
    tracker.abandon("user_closed_modal");
  });

  // Get progress
  const progress = tracker.getProgress();
  console.log(`Progress: ${progress.progressPercent}%`);
}

// ============================================================================
// Helper Functions (implement these in your app)
// ============================================================================

async function createAccount() {
  // Your account creation logic
}

async function saveProfile() {
  // Your profile saving logic
}

async function performAction() {
  // Your action logic
}

async function submitForm(data: any) {
  // Your form submission logic
}

async function registerUser() {
  // Registration logic
}

async function verifyEmail() {
  // Email verification logic
}

async function setupProfile() {
  // Profile setup logic
}

let startTime = Date.now();
