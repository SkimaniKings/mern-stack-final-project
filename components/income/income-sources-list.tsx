"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { IncomeSourceCard } from "@/components/income/income-source-card"
import type { IncomeSource } from "@/types/income"
import { deleteIncomeSource } from "@/app/actions/income-sources"
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IncomeSourcesListProps {
 initialSources: IncomeSource[]
}

export function IncomeSourcesList({ initialSources }: IncomeSourcesListProps) {
 const router = useRouter()
 const [sources, setSources] = useState<IncomeSource[]>(initialSources || [])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [deleteId, setDeleteId] = useState<string | null>(null)
 const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

 useEffect(() => {
   if (!initialSources) {
     setLoading(true)
     setError("Error fetching income sources")
     setLoading(false)
   }
 }, [initialSources])

 const handleEdit = (id: string) => {
   router.push(`/income/sources/${id}/edit`)
 }

 const handleDelete = (id: string) => {
   setDeleteId(id)
   setIsDeleteDialogOpen(true)
 }

 const confirmDelete = async () => {
   if (!deleteId) return

   try {
     await deleteIncomeSource(deleteId)
     setSources(sources.filter((source) => source.id !== deleteId))
   } catch (err) {
     console.error("Error deleting income source:", err)
   } finally {
     setIsDeleteDialogOpen(false)
     setDeleteId(null)
   }
 }

 return (
   <div className="space-y-4 animate-in">
     <div className="flex justify-between items-center">
       <h2 className="text-xl font-semibold tracking-tight">Income Sources</h2>
       <Button onClick={() => router.push("/income/sources/new")}>
         <PlusIcon className="mr-2 h-4 w-4" />
         Add Source
       </Button>
     </div>

     {loading ? (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {[1, 2, 3].map((i) => (
           <Skeleton key={i} className="h-[200px] w-full" />
         ))}
       </div>
     ) : error ? (
       <div className="p-8 text-center">
         <p className="text-muted-foreground">{error}</p>
         <Button variant="outline" className="mt-4" onClick={() => setLoading(true)}>
           Try Again
         </Button>
       </div>
     ) : sources.length === 0 ? (
       <div className="rounded-lg border border-dashed p-8 text-center">
         <h3 className="font-medium">No income sources yet</h3>
         <p className="mt-1 text-sm text-muted-foreground">
           Add your first income source to start tracking your finances.
         </p>
         <Button variant="outline" className="mt-4" onClick={() => router.push("/income/sources/new")}>
           <PlusIcon className="mr-2 h-4 w-4" />
           Add Income Source
         </Button>
       </div>
     ) : (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {sources.map((source) => (
           <IncomeSourceCard key={source.id} source={source} onEdit={handleEdit} onDelete={handleDelete} />
         ))}
       </div>
     )}

     <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
       <AlertDialogContent className="animate-in slide-in-from-bottom-10">
         <AlertDialogHeader>
           <AlertDialogTitle>Are you sure?</AlertDialogTitle>
           <AlertDialogDescription>
             This will permanently delete this income source and remove it from your records.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel>Cancel</AlertDialogCancel>
           <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
             Delete
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </div>
 )
}

