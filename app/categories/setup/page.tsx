"use client"

import { useEffect, useState } from "react"
import { ensureStaticCategories } from "@/app/actions/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function CategorySetupPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setupCategories() {
    try {
      setLoading(true)
      setError(null)
      const setupResult = await ensureStaticCategories()
      setResult(setupResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      console.error('Error setting up categories:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Category Setup</CardTitle>
          <CardDescription>
            Create all predefined expense and income categories in your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <div className="mb-4 p-4 rounded bg-muted">
              <p><strong>Status:</strong> {result.success ? 'Success' : 'Failed'}</p>
              <p><strong>Message:</strong> {result.message}</p>
              {result.created !== undefined && (
                <p><strong>Categories created:</strong> {result.created}</p>
              )}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 rounded bg-destructive/10 text-destructive">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={setupCategories} disabled={loading}>
            {loading ? 'Setting up categories...' : 'Create Categories'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
