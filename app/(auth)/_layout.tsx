/**
 * app/(auth)/_layout.tsx
 *
 * Auth group layout.
 * If the user is already signed in:
 *   - Server says onboarding_complete = true → dashboard
 *   - Server says onboarding_complete = false → resume the correct onboarding step
 *   - Server unreachable → fall back to local SecureStore
 * If NOT signed in → show the auth screen (sign-in / sign-up).
 *
 * NOTE: We always query the server when already signed in to avoid stale
 * local state sending the user to the wrong screen.
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Slot } from "expo-router";
import { useEffect, useState } from "react";

import { fetchAPI, setAuthTokenGetter } from "@/lib/fetch";
import {
  isOnboardingComplete,
  getOnboardingStep,
  setOnboardingComplete,
  setOnboardingStep,
  setCurrentPlan,
  setPlanExpiresAt,
  stepToRoute,
} from "@/lib/onboarding";

type State = "loading" | "show_auth" | "home" | "onboarding";

export default function AuthLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [state, setState]       = useState<State>("loading");
  const [resumeRoute, setResumeRoute] = useState<string>("/(onboarding)/profile-save");

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in — just show the auth screens (sign-in / sign-up)
    if (!isSignedIn) {
      setState("show_auth");
      return;
    }

    // Already signed in — figure out where to send them
    (async () => {
      try {
        setAuthTokenGetter(getToken);

        const userProfile = await fetchAPI("/api/auth/me");

        if (userProfile?.onboarding_complete === true) {
          // Also sync billing so home banner is accurate
          try {
            const billing = await fetchAPI("/api/billing");
            if (billing?.currentPlan) {
              await setCurrentPlan(billing.currentPlan);
              if (billing.expiresAt) await setPlanExpiresAt(billing.expiresAt);
            }
          } catch { /* non-fatal */ }

          await setOnboardingComplete(true);
          setState("home");
          return;
        }

        // Server says incomplete — resume mid-flow
        const serverStep: number = userProfile?.onboarding_step ?? 0;
        const localStep = await getOnboardingStep();
        const step = Math.max(serverStep, localStep);
        await setOnboardingStep(step);
        setResumeRoute(stepToRoute(step));
        setState("onboarding");
      } catch {
        // Server unreachable — fall back to local SecureStore
        const done = await isOnboardingComplete();
        const step = await getOnboardingStep();
        if (done || step >= 9) {
          setState("home");
        } else {
          setResumeRoute(stepToRoute(step));
          setState("onboarding");
        }
      }
    })();
  }, [isLoaded, isSignedIn]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isLoaded || state === "loading") return null;

  if (state === "show_auth") return <Slot />;

  if (state === "home") return <Redirect href="/(root)/(tabs)/home" />;

  return <Redirect href={resumeRoute as any} />;
}
