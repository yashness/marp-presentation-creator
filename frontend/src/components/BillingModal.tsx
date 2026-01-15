import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Check, Sparkles, Zap, Crown } from 'lucide-react'

interface BillingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PricingTier {
  name: string
  price: string
  description: string
  features: string[]
  icon: typeof Sparkles
  popular?: boolean
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    icon: Sparkles,
    features: [
      'Up to 5 presentations',
      'Basic themes',
      'PDF & HTML export',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$9',
    description: 'For professional creators',
    icon: Zap,
    popular: true,
    features: [
      'Unlimited presentations',
      'All themes + custom themes',
      'AI presentation generation',
      'AI image generation',
      'Video export with TTS',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    name: 'Team',
    price: '$29',
    description: 'For teams and organizations',
    icon: Crown,
    features: [
      'Everything in Pro',
      'Team workspace & folders',
      'Brand asset management',
      'Custom branding',
      'Team collaboration',
      'Dedicated support',
      'SSO integration',
    ],
  },
]

export function BillingModal({ open, onOpenChange }: BillingModalProps) {
  const { userId } = useAuth()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (tierName: string) => {
    if (!userId) return

    setLoading(true)
    setSelectedTier(tierName)

    try {
      // In a real implementation, this would call your backend to create a Stripe checkout session
      // For now, we'll just show a placeholder
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`Subscribing to ${tierName} plan for user ${userId}`)

      // TODO: Implement actual Stripe integration
      // const response = await fetch('/api/billing/create-checkout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ tier: tierName, userId })
      // })
      // const { url } = await response.json()
      // window.location.href = url
    } catch (error) {
      console.error('Subscription failed:', error)
    } finally {
      setLoading(false)
      setSelectedTier(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-lg">
            Unlock powerful features to create amazing presentations
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {PRICING_TIERS.map((tier) => {
            const Icon = tier.icon
            const isLoading = loading && selectedTier === tier.name

            return (
              <div
                key={tier.name}
                className={`relative rounded-lg border-2 p-6 transition-all ${
                  tier.popular
                    ? 'border-primary-500 shadow-xl shadow-primary-100 scale-105'
                    : 'border-primary-200 hover:border-primary-300 hover:shadow-lg'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${tier.popular ? 'bg-gradient-to-br from-primary-500 to-secondary-500' : 'bg-primary-100'}`}>
                    <Icon className={`w-6 h-6 ${tier.popular ? 'text-white' : 'text-primary-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-gray-600">{tier.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.price !== '$0' && <span className="text-gray-600">/month</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(tier.name)}
                  disabled={loading || tier.name === 'Free'}
                  className={`w-full ${
                    tier.popular
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600'
                      : ''
                  }`}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  {isLoading ? 'Processing...' : tier.name === 'Free' ? 'Current Plan' : 'Subscribe'}
                </Button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          <p className="mt-2">Need a custom plan? <a href="mailto:support@example.com" className="text-primary-600 hover:underline">Contact us</a></p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
