/**
 * app/index.tsx
 *
 * App entry point — evaluates auth + onboarding state and routes accordingly.
 *
 * Decision tree:
 *   1. Clerk not yet loaded                 → null (splash stays)
 *   2. Signed in + onboarding complete      → /dashboard (home)
 *   3. Signed in + onboarding incomplete    → resume mid-flow
 *   4. Not signed in                        → /sign-up
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import {
  getOnboardingStep,
  isOnboardingComplete,
  stepToRoute,
} from "@/lib/onboarding";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [ready, setReady]               = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [resumeRoute, setResumeRoute]   = useState<string>("/(onboarding)/profile-save");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      const done = await isOnboardingComplete();
      const step = await getOnboardingStep();
      setOnboardingDone(done);
      setResumeRoute(stepToRoute(step));
      setReady(true);
    })();
  }, [isLoaded, isSignedIn]);

  // Wait for Clerk to load
  if (!isLoaded) return null;

  // Not signed in → go to sign-up
  if (!isSignedIn) return <Redirect href="/(auth)/sign-up" />;

  // Signed in but still waiting for async storage read
  if (!ready) return null;

  // Signed in + fully onboarded
  if (onboardingDone) return <Redirect href="/(root)/(tabs)/home" />;

  // Signed in + mid-onboarding
  return <Redirect href={resumeRoute as any} />;
}
