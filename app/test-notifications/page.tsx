'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTestClick = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/notifications/goals');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notification Test Page</h1>
      <p className="mb-4">Click the button below to trigger the goal notification check. This will scan your active goals for any new milestones (25%, 50%, 75%, 100%) and create notifications if you have goal alerts enabled.</p>
      <Button onClick={handleTestClick} disabled={loading}>
        {loading ? 'Checking...' : 'Test Goal Notifications'}
      </Button>
      {result && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
          <h2 className="font-semibold">Result:</h2>
          <pre className="text-sm whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
