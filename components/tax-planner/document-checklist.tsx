import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DocumentChecklist() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Checklist</CardTitle>
        <CardDescription>Required documents for tax season</CardDescription>
      </CardHeader>
      <CardContent>{/* Add checklist content here */}</CardContent>
    </Card>
  )
}

