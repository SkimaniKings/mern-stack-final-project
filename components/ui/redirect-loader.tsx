import { Loader2 } from "lucide-react"

interface RedirectLoaderProps {
  message?: string
}

export function RedirectLoader({ message = "Redirecting..." }: RedirectLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

