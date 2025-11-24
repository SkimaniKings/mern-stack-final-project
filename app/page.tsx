export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth"

export default async function Home() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  redirect("/dashboard")
}

