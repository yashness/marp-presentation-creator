import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react'
import { Button } from './ui/button'
import { LogIn, UserPlus } from 'lucide-react'

export function UserMenu() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-9 h-9',
              userButtonPopoverCard: 'shadow-xl border border-primary-100',
            },
          }}
        />
      </div>
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
