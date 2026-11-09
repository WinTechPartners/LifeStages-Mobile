"use client"

import { useSubscription } from "@/context/subscription-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface UpgradePromptProps {
  feature: string
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  const { startTrial, tier } = useSubscription()

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-blue-50 border-2 border-amber-300">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-amber-600">lock</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Premium Features</h3>
          <p className="text-sm text-gray-600">{feature} are available with a premium subscription</p>
        </div>

        {tier === "free" && (
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={startTrial}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              Start 7-Day Free Trial
            </Button>
            <div className="text-xs text-gray-500">Then $4.99/month or $49.99/year</div>
          </div>
        )}

        {tier === "trial" && (
          <div className="flex flex-col gap-3 w-full">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              Upgrade Now
            </Button>
            <div className="text-xs text-gray-500">$4.99/month or $49.99/year</div>
          </div>
        )}
      </div>
    </Card>
  )
}
