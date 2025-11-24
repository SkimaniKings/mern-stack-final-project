"use client"

import { ProfileDebug } from "@/components/debug/profile-debug"

export default function ProfileDebugPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Profile Image Debug</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ProfileDebug />
        </div>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>If your profile image is not showing, try uploading a new one from the profile page</li>
              <li>Make sure the image is less than 2MB in size</li>
              <li>Supported formats: JPEG, PNG, GIF, WebP</li>
              <li>Try clearing your browser cache</li>
              <li>Check if the Avatar URL field shows a valid URL</li>
            </ul>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">How it Works</h2>
            <p className="mb-2">When you upload a profile image:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>The image is converted to base64 format</li>
              <li>It's sent to the server via the profile API</li>
              <li>The server uploads it to Supabase Storage</li>
              <li>A public URL is generated and saved to your profile</li>
              <li>The URL is used in the avatar components throughout the app</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
