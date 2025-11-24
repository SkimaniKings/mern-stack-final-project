// Fixed implementations of the ROI and duplicate detection functions

export async function getSubscriptionROI() {
  try {
    // Use our helper function to get authenticated client
    const { user, supabase } = await getAuthenticatedClient()
    
    if (!user) {
      redirect("/login")
    }
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return []
    }

    // Define interface for subscription data
    interface SubscriptionData {
      id: string;
      name: string;
      provider: string;
      category?: string;
      amount: number;
      billing_cycle: string;
      usage_frequency: string;
      auto_renew?: boolean;
      payment_method?: string;
    }

    let allSubscriptions: SubscriptionData[] = []

    // Get data from the subscriptions table
    try {
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          name,
          vendor,
          amount,
          frequency,
          category_id,
          auto_renew,
          support_contact,
          usage_rating
        `)
        .eq("user_id", user.id)
        .eq("status", "active")

      if (error) {
        console.error("Error fetching subscriptions for ROI:", error)
        return [] // Return empty array instead of throwing error for more resilience
      }

      if (!subscriptions || subscriptions.length === 0) {
        return [] // Return empty array instead of throwing error for more resilience
      }

      // Fetch categories to map category_id to names
      const categoryMap: Record<string, string> = {}
      try {
        const { data: categories } = await supabase
          .from("subscription_categories")
          .select('id, name')

        if (categories) {
          categories.forEach(cat => {
            if (cat.id) categoryMap[cat.id] = cat.name
          })
        }
      } catch (catError) {
        console.error("Error fetching categories:", catError)
        // Continue without categories
      }

      // Format the data to match our interface
      allSubscriptions = subscriptions.map(sub => {
        // Map usage_rating to usage_frequency
        const usageFrequency = mapRatingToUsage(sub.usage_rating as number | null)
        
        return {
          id: sub.id,
          name: sub.name,
          provider: sub.vendor || 'Unknown',
          category: sub.category_id && categoryMap[sub.category_id] ? categoryMap[sub.category_id] : 'Uncategorized',
          amount: sub.amount,
          billing_cycle: sub.frequency || 'monthly',
          usage_frequency: usageFrequency,
          auto_renew: sub.auto_renew || false,
          payment_method: sub.support_contact || 'Unknown'
        } as SubscriptionData
      })
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      return [] // Return empty array instead of throwing error for more resilience
    }
    
    // If we have no data at all, return empty array
    if (allSubscriptions.length === 0) {
      return []
    }

    // Calculate monthly cost for each subscription
    const subscriptionsWithROI = await Promise.all(
      allSubscriptions.map(async (sub) => {
        let monthlyAmount = sub.amount

        // Convert to monthly amount based on billing cycle
        switch (sub.billing_cycle) {
          case "weekly":
            monthlyAmount = sub.amount * 4.33 // Average weeks in a month
            break
          case "biweekly":
            monthlyAmount = sub.amount * 2.17 // Average bi-weeks in a month
            break
          case "quarterly":
            monthlyAmount = sub.amount / 3
            break
          case "semiannually":
            monthlyAmount = sub.amount / 6
            break
          case "annually":
            monthlyAmount = sub.amount / 12
            break
        }

        // Get usage data for this subscription
        const { data: usageData, error: usageError } = await supabase
          .from("subscription_usage")
          .select("usage_value, duration_minutes")
          .eq("subscription_id", sub.id)
          .order("usage_date", { ascending: false })
          .limit(10)
        
        // Define the usage data interface
        interface UsageData {
          usage_value?: number;
          duration_minutes?: number;
        }

        // Calculate ROI metrics
        let usageScore = 5 // Default medium usage
        let usageHours = 0
        let monthlyAmountValid = sub.amount || 0

        if (usageData && usageData.length > 0) {
          usageScore = usageData.reduce((sum, item: UsageData) => sum + (item.usage_value || 0), 0) / usageData.length
          usageHours = usageData.reduce((sum, item: UsageData) => sum + ((item.duration_minutes || 0) / 60), 0)
        } else {
          // Estimate based on usage_frequency if no specific data
          switch (sub.usage_frequency) {
            case "low":
              usageScore = 3
              usageHours = 2
              break
            case "medium":
              usageScore = 5
              usageHours = 8
              break
            case "high":
              usageScore = 8
              usageHours = 20
              break
          }
        }
        
        // Calculate value metrics
        const costPerUse = usageData && usageData.length > 0 ? monthlyAmount / Math.max(1, usageData.length) : monthlyAmount
        const costPerHour = monthlyAmount / Math.max(1, usageHours)

        // Calculate ROI score (0-100)
        // Higher usage score and lower cost per use = better ROI
        const roiScore = Math.min(100, Math.max(0, (usageScore * 10) - (costPerUse * 2) + (50 - costPerHour)))
        
        // Determine if this is a good value
        const valueCategory = roiScore >= 70 ? "good" : roiScore >= 40 ? "average" : "poor"
        
        // Recommendation based on ROI
        let recommendation = ""
        if (valueCategory === "poor") {
          recommendation = "Consider cancelling this subscription or finding ways to use it more frequently."
        } else if (valueCategory === "average") {
          recommendation = "Look for ways to maximize the value of this subscription or consider alternatives."
        } else {
          recommendation = "This subscription provides good value. Continue using it regularly."
        }
        
        return {
          ...sub,
          monthlyAmount,
          usageScore,
          usageHours,
          costPerUse,
          costPerHour,
          roiScore,
          valueCategory,
          recommendation,
        }
      }),
    )

    // Sort by ROI score (worst to best)
    return subscriptionsWithROI.sort((a, b) => a.roiScore - b.roiScore)
  } catch (error) {
    console.error("Error in getSubscriptionROI:", error)
    throw new Error("Failed to calculate subscription ROI")
  }
}

export async function findDuplicateServices() {
  try {
    // Use our helper function to get authenticated client
    const { user, supabase } = await getAuthenticatedClient()
    
    if (!user) {
      redirect("/login")
    }
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return []
    }
    
    // Define interface for subscription data
    interface SubscriptionData {
      id: string;
      name: string;
      vendor: string;
      amount: number;
      frequency: string;
      category: string;
    }
    
    let allSubscriptions: SubscriptionData[] = [];

    // Get data from the subscriptions table
    try {
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          name,
          vendor,
          amount,
          frequency,
          category_id
        `)
        .eq("user_id", user.id)
        .eq("status", "active")

      if (error) {
        console.error("Error fetching subscriptions for duplicate check:", error)
        return [] // Return empty array instead of throwing error for more resilience
      }

      if (!subscriptions || subscriptions.length === 0) {
        return [] // Return empty array instead of throwing error for more resilience
      }

      // Fetch categories to map category_id to names
      const categoryMap: Record<string, string> = {}
      try {
        const { data: categories } = await supabase
          .from("subscription_categories")
          .select('id, name')

        if (categories) {
          categories.forEach(cat => {
            if (cat.id) categoryMap[cat.id] = cat.name
          })
        }
      } catch (catError) {
        console.error("Error fetching categories:", catError)
        // Continue without categories
      }

      // Format the subscriptions with category information
      allSubscriptions = subscriptions.map(sub => ({
        id: sub.id,
        name: sub.name,
        vendor: sub.vendor || 'Unknown',
        amount: sub.amount,
        frequency: sub.frequency || 'monthly',
        category: sub.category_id && categoryMap[sub.category_id] ? categoryMap[sub.category_id] : 'Uncategorized'
      }));
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      return [] // Return empty array instead of throwing error for more resilience
    }

    // Group subscriptions by category
    const subscriptionsByCategory = allSubscriptions.reduce<Record<string, SubscriptionData[]>>((acc, sub) => {
      // Use the category field directly from our mapped data
      const categoryName = sub.category || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(sub);
      return acc;
    }, {});

    // Find potential duplicates within each category
    const potentialDuplicates = [];

    for (const category in subscriptionsByCategory) {
      const subs = subscriptionsByCategory[category];

      // Only check categories with multiple subscriptions
      if (subs.length > 1) {
        // Check for streaming services
        if (category.toLowerCase().includes("streaming") || category.toLowerCase().includes("entertainment")) {
          potentialDuplicates.push({
            category,
            subscriptions: subs,
            reason: "Multiple streaming services detected",
            recommendation: "Consider consolidating to fewer streaming platforms or rotating subscriptions monthly"
          });
        }

        // Check for similar service providers
        const providers = subs.map(s => (s.vendor || '').toLowerCase());
        const uniqueProviders = new Set(providers);

        if (providers.length > uniqueProviders.size) {
          // Find the duplicated providers
          const duplicatedProviders = providers.filter((item, index) => providers.indexOf(item) !== index);

          for (const provider of duplicatedProviders) {
            const duplicateSubs = subs.filter(s => (s.vendor || '').toLowerCase() === provider);
            potentialDuplicates.push({
              category,
              subscriptions: duplicateSubs,
              reason: `Multiple subscriptions from ${provider}`,
              recommendation: "Check if these services can be bundled or if one can be eliminated"
            });
          }
        }

        // Check for potentially overlapping services
        if (subs.length >= 3) {
          potentialDuplicates.push({
            category,
            subscriptions: subs,
            reason: `Multiple services in ${category} category`,
            recommendation: "Review if all these services are necessary or if some have overlapping features"
          });
        }
      }
    }

    return potentialDuplicates;
  } catch (error) {
    console.error("Error in findDuplicateServices:", error);
    throw new Error("Failed to find duplicate services");
  }
}
