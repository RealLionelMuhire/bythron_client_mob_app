/**
 * app/(auth)/_layout.tsx
 *
 * Auth group layout.
 * If the user is already signed in:
 *   - Onboarding complete → dashboard
 *   - Onboarding in progress → resume the correct step
 *   - No onboarding state → profile-save (start of onboarding)
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Slot } from "expo-router";
import { useEffect, useState } from "react";

import {
  isOnboardingComplete,
  getOnboardingStep,
  stepToRoute,
} from "@/lib/onboarding";

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const [ready, setReady]                   = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [resumeRoute, setResumeRoute]       = useState<string>("/(onboarding)/profile-save");

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

  // Wait for Clerk
  if (!isLoaded) return null;

  // Not signed in → show auth screens
  if (!isSignedIn) return <Slot />;

  // Signed in but still reading storage
  if (!ready) return null;

  // Fully onboarded
  if (onboardingDone) return <Redirect href="/(root)/(tabs)/home" />;

  // Mid-onboarding
  return <Redirect href={resumeRoute as any} />;
}
