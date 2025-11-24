"use client"

import { UserAvatar } from "./user-avatar"

export function TestAvatars() {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">Avatar Test</h2>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <p className="text-sm mb-2">Small</p>
          <UserAvatar size="sm" />
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-sm mb-2">Medium (default)</p>
          <UserAvatar />
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-sm mb-2">Large</p>
          <UserAvatar size="lg" />
        </div>
      </div>
    </div>
  )
}
