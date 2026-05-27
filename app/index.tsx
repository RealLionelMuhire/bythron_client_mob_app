/**
 * app/index.tsx
 *
 * App entry point — evaluates auth + onboarding state and routes accordingly.
 *
 * Decision tree:
 *   1. Clerk not yet loaded                         → null (splash stays)
 *   2. Not signed in                               → /sign-up
 *   3. Signed in → fetch /api/auth/me from server
 *      a. server says onboarding_complete = true   → /home (skip plan screen)
 *      b. server says onboarding_complete = false  → resume mid-flow
 *      c. server request fails                     → fall back to local SecureStore
 *
 * NOTE: We ALWAYS prefer the server's onboarding_complete flag over the local
 * SecureStore value. Local state is only the fallback for offline/first-boot.
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
  const [state, setState] = useState<RoutingState>("loading");
  const [resumeRoute, setResumeRoute] = useState<string>("/(onboarding)/plan");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState("onboarding"); // will render sign-up redirect
      return;
    }

    (async () => {
      try {
        // Register auth token getter early so fetchAPI can attach Bearer tokens
        setAuthTokenGetter(getToken);

        // ── 1. Ask the server what the user's real state is ─────────────────
        const userProfile = await fetchAPI("/api/auth/me");

        if (userProfile?.onboarding_complete === true) {
          // Server says complete — write to local store and go home
          await setOnboardingComplete(true);
          if (userProfile.onboarding_step) {
            await setOnboardingStep(userProfile.onboarding_step);
          }

          // Also sync billing info so the home plan banner is accurate
          try {
            const billing = await fetchAPI("/api/billing");
            if (billing?.currentPlan) {
              await setCurrentPlan(billing.currentPlan);
              if (billing.expiresAt) await setPlanExpiresAt(billing.expiresAt);
            }
          } catch {
            // Non-fatal — plan banner will just show defaults
          }

          setState("home");
          return;
        }

        // Server says NOT complete — figure out which step to resume at
        const serverStep: number = userProfile?.onboarding_step ?? 0;
        const localStep = await getOnboardingStep();
        const step = Math.max(serverStep, localStep); // never go backwards
        await setOnboardingStep(step);
        await setOnboardingComplete(false);
        setResumeRoute(stepToRoute(step));
        setState("onboarding");
      } catch (err) {
        // Network/auth error — fall back to local SecureStore
        console.warn("[Index] Server sync failed, falling back to local state:", err);
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

  if (!isSignedIn) return <Redirect href="/(auth)/sign-up" />;

  if (state === "home") return <Redirect href="/(root)/(tabs)/home" />;

  return <Redirect href={resumeRoute as any} />;
}
