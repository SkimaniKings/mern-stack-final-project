"use server"

import { getExpenses } from "@/app/actions/expenses"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"

export async function getServerSideProps() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return {
      redirect: {
        destination: "/login?from=expenses",
        permanent: false,
      },
    }
  }

  try {
    const expenses = await getExpenses()
    return {
      props: {
        expenses,
        user,
      },
    }
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return {
      props: {
        expenses: [],
        user,
        error: "Failed to fetch expenses",
      },
    }
  }
}

import { ExpensesList } from "@/components/expenses/expenses-list"

export default function ExpensesPageServer({
  expenses,
  user,
  error,
}: {
  expenses: any[]
  user: any
  error?: string
}) {
  return <ExpensesList expenses={expenses} error={error} />
            <p className="text-sm text-gray-500">No expenses found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
