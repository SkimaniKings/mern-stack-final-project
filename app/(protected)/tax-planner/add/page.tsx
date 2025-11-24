import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { TaxInfoForm } from "@/components/tax/tax-info-form"
import { TaxBreadcrumb } from "@/components/tax/tax-breadcrumb"
import { PlusCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Add Tax Information",
  description: "Add new tax deductions, documents, or timeline items.",
}

export default async function AddTaxDataPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Add Tax Information"
        text="Add new tax deductions, documents, or timeline items to your tax planning."
        icon={<PlusCircle className="h-6 w-6" />}
      />
      <TaxBreadcrumb />
      <div className="grid gap-8">
        <TaxInfoForm />
      </div>
    </DashboardShell>
  )
} 