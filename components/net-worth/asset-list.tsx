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
import { AssetDialog } from "./asset-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface Asset {
  id: string
  name: string
  type: string
  value: number
  acquired_at?: string
  description?: string
  asset_type?: string
}

interface AssetListProps {
  assets: Asset[]
}

export function AssetList({ assets }: AssetListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Assets</CardTitle>
          <CardDescription>
            Manage your assets to track your net worth
          </CardDescription>
        </div>
        <AssetDialog variant="add" />
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              You haven't added any assets yet
            </p>
            <AssetDialog 
              variant="add" 
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Asset
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
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name || asset.asset_type || 'Unnamed Asset'}</TableCell>
                    <TableCell>
                      {asset.type || asset.asset_type || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(asset.value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <AssetDialog
                          variant="edit"
                          asset={asset}
                        />
                        <AssetDialog
                          variant="delete"
                          asset={asset}
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
          Total Assets: {assets.length}
        </div>
        <div className="font-medium">
          Total Value: {formatCurrency(assets.reduce((sum, asset) => sum + asset.value, 0))}
        </div>
      </CardFooter>
    </Card>
  )
}
