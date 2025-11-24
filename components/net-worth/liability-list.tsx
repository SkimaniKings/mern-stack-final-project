"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils/format"
import { LiabilityDialog } from "./liability-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface Liability {
  id: string
  name: string
  type: string
  amount: number
  amount_due?: number
  interest_rate?: number
  due_date?: string
  description?: string
  liability_type?: string
}

interface LiabilityListProps {
  liabilities: Liability[]
}

export function LiabilityList({ liabilities }: LiabilityListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Liabilities</CardTitle>
          <CardDescription>
            Manage your liabilities to track your net worth
          </CardDescription>
        </div>
        <LiabilityDialog variant="add" />
      </CardHeader>
      <CardContent>
        {liabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              You haven't added any liabilities yet
            </p>
            <LiabilityDialog 
              variant="add" 
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Liability
                </Button>
              } 
            />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilities.map((liability) => (
                  <TableRow key={liability.id}>
                    <TableCell className="font-medium">{liability.name || liability.liability_type || 'Unnamed Liability'}</TableCell>
                    <TableCell>
                      {liability.type || liability.liability_type || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(liability.amount_due || liability.amount || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <LiabilityDialog
                          variant="edit"
                          liability={liability}
                        />
                        <LiabilityDialog
                          variant="delete"
                          liability={liability}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="text-sm text-muted-foreground">
          Total Liabilities: {liabilities.length}
        </div>
        <div className="font-medium">
          Total Amount: {formatCurrency(liabilities.reduce((sum, liability) => sum + (liability.amount_due || liability.amount || 0), 0))}
        </div>
      </CardFooter>
    </Card>
  )
}
