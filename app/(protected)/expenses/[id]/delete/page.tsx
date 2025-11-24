"use server"

import { deleteExpense } from "@/app/actions/expenses"
import { redirect } from "next/navigation"

export default async function DeleteExpense({
  params,
}: {
  params: { id: string }
}) {
  try {
    await deleteExpense(params.id)
    redirect("/expenses")
  } catch (error) {
    console.error("Error deleting expense:", error)
    redirect("/expenses")
  }
}
