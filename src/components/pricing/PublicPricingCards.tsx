"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Plan configurations based on the subscription schema (matching authenticated version)
const PLANS = {
  BASIC: {
    name: "Basic",
    monthlyPrice: 5,
    yearlyPrice: 50,
    calendarProviders: 1,
    features: [
      "1 Calendar Provider",
      "Basic Calendar Sync",
      "Task Management",
      "Email Support",
    ],
  },
  PRO: {
    name: "Pro",
    monthlyPrice: 9,
    yearlyPrice: 90,
    calendarProviders: 2,
    features: [
      "Everything in Basic",
      "2 Calendar Providers",
      "Advanced Scheduling",
      "Priority Support",
      "Calendar Analytics",
    ],
  },
  ADVANCED: {
    name: "Advanced",
    monthlyPrice: 19,
    yearlyPrice: 190,
    calendarProviders: null, // unlimited
    features: [
      "Everything in Pro",
      "Unlimited Calendar Providers",
      "Team Collaboration",
      "Advanced Analytics",
      "Custom Integrations",
      "24/7 Support",
    ],
  },
};

export default function PublicPricingCards() {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="container py-4 lg:py-4">
      {/* Billing Toggle */}
      <div className="flex justify-center items-center mb-12">
        <Label htmlFor="payment-schedule" className="me-3">
          Monthly
        </Label>
        <Switch
          checked={isAnnual}
          onCheckedChange={() => setIsAnnual(!isAnnual)}
          id="payment-schedule"
        />
        <Label htmlFor="payment-schedule" className="relative ms-3">
          Annual
          <span className="absolute -top-10 start-auto -end-28">
            <span className="flex items-center">
              <svg
                className="w-14 h-8 -me-6"
                width={45}
                height={25}
                viewBox="0 0 45 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M43.2951 3.47877C43.8357 3.59191 44.3656 3.24541 44.4788 2.70484C44.5919 2.16427 44.2454 1.63433 43.7049 1.52119L43.2951 3.47877ZM4.63031 24.4936C4.90293 24.9739 5.51329 25.1423 5.99361 24.8697L13.8208 20.4272C14.3011 20.1546 14.4695 19.5443 14.1969 19.0639C13.9242 18.5836 13.3139 18.4152 12.8336 18.6879L5.87608 22.6367L1.92723 15.6792C1.65462 15.1989 1.04426 15.0305 0.563943 15.3031C0.0836291 15.5757 -0.0847477 16.1861 0.187863 16.6664L4.63031 24.4936ZM43.7049 1.52119C32.7389 -0.77401 23.9595 0.99522 17.3905 5.28788C10.8356 9.57127 6.58742 16.2977 4.53601 23.7341L6.46399 24.2659C8.41258 17.2023 12.4144 10.9287 18.4845 6.96211C24.5405 3.00476 32.7611 1.27399 43.2951 3.47877L43.7049 1.52119Z"
                  fill="currentColor"
                  className="text-muted-foreground"
                />
              </svg>
              <Badge className="mt-3 uppercase">Save up to 20%</Badge>
            </span>
          </span>
        </Label>
      </div>

      {/* Pricing Cards Grid - 4 options with featured trial */}
      <div className="grid sm:grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl mx-auto">
        {/* Trial Section - Featured */}
        <Card className="border-2 border-blue-500 shadow-2xl flex flex-col h-full relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 text-xs font-medium rounded-full">
              Popular
            </Badge>
          </div>
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="mb-7 text-xl">14-Day Free Trial</CardTitle>
            <div className="font-bold text-4xl flex flex-col items-center">
              <span className="flex items-baseline text-blue-600">FREE</span>
              <span className="text-sm font-normal text-muted-foreground mt-1">
                Full access to everything
              </span>
            </div>
          </CardHeader>
          <CardDescription className="text-center w-11/12 mx-auto">
            Experience all features{" "}
            <span className="font-semibold text-blue-600">
              without adding credit card
            </span>
          </CardDescription>
          <CardContent className="flex-grow">
            <ul className="mt-7 space-y-2.5 text-sm">
              <PricingFeatureItem>
                ✨ Saves 2+ hours daily with AI scheduling
              </PricingFeatureItem>
              <PricingFeatureItem>🔗 Unlimited calendar providers</PricingFeatureItem>
              <PricingFeatureItem>📊 Advanced analytics & insights</PricingFeatureItem>
              <PricingFeatureItem>⚡ 30-second task scheduling</PricingFeatureItem>
              <PricingFeatureItem>🛡️ Enterprise-grade security</PricingFeatureItem>
              <PricingFeatureItem>💬 Priority support included</PricingFeatureItem>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-sm py-3 px-4 font-semibold" onClick={handleGetStarted}>
              Start Free Trial
            </Button>
          </CardFooter>
        </Card>

        {/* Basic Plan */}
        <Card className="flex flex-col h-full">
          <CardHeader className="text-center pb-2">
            <CardTitle className="mb-7 text-xl">Basic</CardTitle>
            <div className="font-bold text-4xl flex flex-col items-center">
              {isAnnual ? (
                <>
                  <span className="text-2xl line-through text-muted-foreground">
                    ${PLANS.BASIC.monthlyPrice}
                  </span>
                  <span className="flex items-baseline">
                    ${Math.round(PLANS.BASIC.yearlyPrice / 12)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      /month
                    </span>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground mt-1">
                    Save 17% annually
                  </span>
                </>
              ) : (
                <span className="flex items-baseline">
                  ${PLANS.BASIC.monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /month
                  </span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardDescription className="text-center w-11/12 mx-auto">
            Perfect for personal use
          </CardDescription>
          <CardContent className="flex-grow">
            <ul className="mt-7 space-y-2.5 text-sm">
              <PricingFeatureItem>Everything in trial</PricingFeatureItem>
              <PricingFeatureItem>1 calendar provider</PricingFeatureItem>
              <PricingFeatureItem>Basic calendar sync</PricingFeatureItem>
              <PricingFeatureItem>Task management</PricingFeatureItem>
              <PricingFeatureItem>Email support</PricingFeatureItem>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleGetStarted}
            >
              Start with Basic
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col h-full">
          <CardHeader className="text-center pb-2">
            <CardTitle className="mb-7 text-xl">Pro</CardTitle>
            <div className="font-bold text-4xl flex flex-col items-center">
              {isAnnual ? (
                <>
                  <span className="text-2xl line-through text-muted-foreground">
                    ${PLANS.PRO.monthlyPrice}
                  </span>
                  <span className="flex items-baseline">
                    ${Math.round(PLANS.PRO.yearlyPrice / 12)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      /month
                    </span>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground mt-1">
                    Save 17% annually
                  </span>
                </>
              ) : (
                <span className="flex items-baseline">
                  ${PLANS.PRO.monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /month
                  </span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardDescription className="text-center w-11/12 mx-auto">
            For busy professionals
          </CardDescription>
          <CardContent className="flex-grow">
            <ul className="mt-7 space-y-2.5 text-sm">
              <PricingFeatureItem>Everything in trial</PricingFeatureItem>
              <PricingFeatureItem>2 calendar providers</PricingFeatureItem>
              <PricingFeatureItem>Advanced scheduling</PricingFeatureItem>
              <PricingFeatureItem>Priority email support</PricingFeatureItem>
              <PricingFeatureItem>Usage analytics</PricingFeatureItem>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleGetStarted}
            >
              Start with Pro
            </Button>
          </CardFooter>
        </Card>

        {/* Advanced Plan */}
        <Card className="flex flex-col h-full relative">
          <CardHeader className="text-center pb-2">
            <CardTitle className="!mb-7 text-xl">Advanced</CardTitle>
            <div className="font-bold text-4xl flex flex-col items-center">
              {isAnnual ? (
                <>
                  <span className="text-2xl line-through text-muted-foreground">
                    ${PLANS.ADVANCED.monthlyPrice}
                  </span>
                  <span className="flex items-baseline">
                    ${Math.round(PLANS.ADVANCED.yearlyPrice / 12)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      /month
                    </span>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground mt-1">
                    Save 17% annually
                  </span>
                </>
              ) : (
                <span className="flex items-baseline">
                  ${PLANS.ADVANCED.monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /month
                  </span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardDescription className="text-center w-11/12 mx-auto">
            For teams and power users
          </CardDescription>
          <CardContent className="flex-grow">
            <ul className="mt-7 space-y-2.5 text-sm">
              <PricingFeatureItem>Everything in Pro</PricingFeatureItem>
              <PricingFeatureItem>Unlimited calendar providers</PricingFeatureItem>
              <PricingFeatureItem>Team collaboration</PricingFeatureItem>
              <PricingFeatureItem>Advanced analytics</PricingFeatureItem>
              <PricingFeatureItem>Custom integrations</PricingFeatureItem>
              <PricingFeatureItem>24/7 priority support</PricingFeatureItem>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleGetStarted}
            >
              Start with Advanced
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-20 lg:mt-32"></div>
    </div>
  );
}

interface PricingFeatureItemProps {
  children: React.ReactNode;
}

function PricingFeatureItem({ children }: PricingFeatureItemProps) {
  return (
    <li className="flex space-x-2">
      <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
