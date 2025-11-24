import { ClientWatchlist } from "./client-watchlist"

// Use dynamic rendering for this page to ensure fresh data
export const dynamic = "force-dynamic"

// Simple page that uses the client-side component for all functionality
export default function WatchlistPage() {
  return <ClientWatchlist />
}
