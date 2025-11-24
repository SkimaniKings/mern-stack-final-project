import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function DemoModeAlert() {
  return (
    <Alert variant="default" className="bg-primary/5 border-primary/20 mb-6">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertTitle>Demo Mode</AlertTitle>
      <AlertDescription>
        This is a demo version with sample data. In a production environment, this would use your actual financial data.
      </AlertDescription>
    </Alert>
  )
}

