'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function SyncClientSubscriptions() {
  // This component is now just an informational message
  // since all subscriptions are saved directly to the database
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          All Subscriptions Saved to Database
        </CardTitle>
        <CardDescription>
          All your subscriptions are now saved directly to the database.
          This allows you to access them from any device without needing to sync.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">
          We've updated our subscription system to save all your data directly to the database.
          This provides a more seamless experience and ensures your subscription information is
          always available across all your devices.
        </p>
      </CardContent>
    </Card>
  );
}
