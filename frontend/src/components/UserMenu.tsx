import { useState } from 'react'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react'
import { Button } from './ui/button'
import { LogIn, UserPlus, CreditCard } from 'lucide-react'
import { BillingModal } from './BillingModal'

export function UserMenu() {
  const { isSignedIn } = useAuth()
  const [billingOpen, setBillingOpen] = useState(false)

  if (isSignedIn) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBillingOpen(true)}
            className="w-full shadow-sm justify-start"
          >
            <CreditCard className="w-4 h-4" />
            Manage Billing
          </Button>
          <div className="flex items-center justify-between pt-2 border-t border-primary-100">
            <span className="text-xs text-gray-600">Signed in</span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'shadow-xl border border-primary-100',
                },
              }}
            />
          </div>
        </div>
        <BillingModal open={billingOpen} onOpenChange={setBillingOpen} />
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button variant="outline" size="sm" className="shadow-sm">
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm" className="shadow-sm">
          <UserPlus className="w-4 h-4" />
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  )
}
