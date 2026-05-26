export type PlanId = "trial" | "basic" | "fleet";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  duration: number; // days
  vehicles: number | null; // null = unlimited
  features: string[];
  badge: string | null;
}

export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Free Trial",
    price: 0,
    currency: "RWF",
    duration: 14,
    vehicles: 1,
    features: ["1 vehicle", "Live tracking", "Basic alerts"],
    badge: "14 days free",
  },
  {
    id: "basic",
    name: "Basic",
    price: 5000,
    currency: "RWF",
    duration: 30,
    vehicles: 3,
    features: ["Up to 3 vehicles", "Live tracking", "Alerts", "Trip history"],
    badge: null,
  },
  {
    id: "fleet",
    name: "Fleet",
    price: 15000,
    currency: "RWF",
    duration: 30,
    vehicles: null,
    features: ["Unlimited vehicles", "Live tracking", "Alerts", "Trip history", "Reports", "Priority support"],
    badge: "Most popular",
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}
