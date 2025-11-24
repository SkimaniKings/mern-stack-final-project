"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { testDatabaseConnection } from "@/app/actions/test-db"

export default function TestDatabasePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    try {
      const testResult = await testDatabaseConnection()
      setResult(testResult)
    } catch (error) {
      console.error("Error testing database:", error)
      setResult({ success: false, error: "Failed to test database" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
          <CardDescription>
            Test the connection to the Supabase database and verify that tables exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTest} disabled={loading}>
            {loading ? "Testing..." : "Test Database Connection"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-medium">
                {result.success ? "Test Successful" : "Test Failed"}
              </h3>
              <pre className="mt-2 rounded-md bg-slate-100 p-4 text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 