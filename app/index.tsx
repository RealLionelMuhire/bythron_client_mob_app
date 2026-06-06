/**
 * app/index.tsx
 *
 * App entry point — evaluates auth + onboarding state and routes accordingly.
 *
 * Decision tree (in priority order):
 *   1. Clerk not loaded                                → null (splash)
 *   2. Not signed in                                   → /sign-up
 *   3. Signed in:
 *      a. /api/auth/me  says onboarding_complete=true  → /home
 *      b. /api/billing  has any active plan            → /home  ← KEY FALLBACK
 *         (server DB may have stale onboarding_complete=false even with a sub)
 *      c. Neither → resume onboarding at correct step
 *      d. Server unreachable → fall back to local SecureStore
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { fetchAPI, setAuthTokenGetter } from "@/lib/fetch";
import {
  getOnboardingStep,
  isOnboardingComplete,
  setOnboardingComplete,
  setOnboardingStep,
  setCurrentPlan,
  setPlanExpiresAt,
  stepToRoute,
} from "@/lib/onboarding";

type RoutingState = "loading" | "home" | "onboarding";

export default function Index() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState]           = useState<RoutingState>("loading");
  const [resumeRoute, setResumeRoute] = useState<string>("/(onboarding)/plan");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState("onboarding"); // will render /sign-up redirect below
      return;
    }

    (async () => {
      try {
        setAuthTokenGetter(getToken);

        // ── Step 1: Check user profile ─────────────────────────────────────
        const userProfile = await fetchAPI("/api/auth/me");

        if (userProfile?.onboarding_complete === true) {
          await setOnboardingComplete(true);
          if (userProfile.onboarding_step) await setOnboardingStep(userProfile.onboarding_step);
          // Sync billing silently
          try {
            const billing = await fetchAPI("/api/billing");
            if (billing?.currentPlan) {
              await setCurrentPlan(billing.currentPlan);
              if (billing.expiresAt) await setPlanExpiresAt(billing.expiresAt);
            }
          } catch { /* non-fatal */ }
          setState("home");
          return;
        }

        // ── Step 2: Check billing (KEY FALLBACK) ───────────────────────────
        // The server returns currentPlan='trial' as a DEFAULT even for users
        // with NO subscription record. So we check expiresAt — it is only
        // non-null when an actual subscription row exists in the database.
        try {
          const billing = await fetchAPI("/api/billing");
          const hasRealSub = billing?.expiresAt != null; // null means no real sub
          if (hasRealSub) {
            await setOnboardingComplete(true);
            await setCurrentPlan(billing.currentPlan);
            await setPlanExpiresAt(billing.expiresAt);
            setState("home");
            return;
          }
        } catch { /* billing endpoint unavailable — continue to onboarding */ }

        // ── Step 3: Resume mid-onboarding ──────────────────────────────────
        const serverStep: number = userProfile?.onboarding_step ?? 0;
        const localStep = await getOnboardingStep();
        const step = Math.max(serverStep, localStep);
        await setOnboardingStep(step);
        await setOnboardingComplete(false);
        setResumeRoute(stepToRoute(step));
        setState("onboarding");

      } catch (err) {
        // Network failure — fall back to local SecureStore
        console.warn("[Index] Server unreachable, using local state:", err);
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isLoaded || state === "loading") return null;

  if (!isSignedIn) return <Redirect href="/(auth)/sign-up" />;

  if (state === "home") return <Redirect href="/(root)/(tabs)/home" />;

  return <Redirect href={resumeRoute as any} />;
}
