import { createServerClient as createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNotificationPreferences, createNotification } from '@/app/actions/notifications'

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Get user's notification preferences
    const { preferences } = await getNotificationPreferences()

    if (!preferences?.goal_alerts) {
      return NextResponse.json({ message: 'Goal alerts are disabled for this user.' })
    }

    // Get the ID for the 'Goal Alert' notification type
    const { data: typeData, error: typeError } = await supabase
      .from('notification_types')
      .select('id')
      .eq('name', 'Goal Alert')
      .single();

    if (typeError || !typeData) {
      console.error('Error fetching Goal Alert notification type:', typeError);
      return NextResponse.json({ error: 'Server configuration error: Could not find Goal Alert type.' }, { status: 500 });
    }
    const goalAlertTypeId = typeData.id;

    // 2. Fetch all active financial goals for the user
    const { data: goals, error: goalsError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch financial goals' }, { status: 500 })
    }

    console.log(`Found ${goals.length} active goals for user ${user.id}.`);

    let notificationsCreated = 0;

    for (const goal of goals) {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const milestones = [25, 50, 75, 100];

      console.log(`- Checking Goal: '${goal.name}', Progress: ${progress.toFixed(2)}%`);

      for (const milestone of milestones) {
        if (progress >= milestone) {
          console.log(`  - Progress is >= ${milestone}%. Checking for existing notification...`);
                    // For testing purposes, we will bypass the check for existing notifications
          // and always create a new one if the milestone is met.

          // // 3. Check if a notification for this milestone has been sent
          // const { data: existingNotification, error: checkError } = await supabase
          //   .from('goal_milestone_notifications')
          //   .select('id')
          //   .eq('goal_id', goal.id)
          //   .eq('milestone_percentage', milestone)
          //   .single();

          // if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
          //   console.error(`Error checking for existing milestone notification:`, checkError);
          //   continue; // Move to the next milestone
          // }

          // if (!existingNotification) {
            console.log(`    - Milestone met. Creating new notification (testing mode).`);
            // 4. Create notification
            const message = milestone < 100
              ? `You've reached ${milestone}% of your '${goal.name}' goal!`
              : `Congratulations! You've fully funded your '${goal.name}' goal!`;

            await createNotification({
              userId: user.id,
              notificationTypeId: goalAlertTypeId,
              message,
              link: `/goals/${goal.id}`,
            });

            notificationsCreated++;

            // // 5. Log that the milestone notification has been sent
            // const { error: insertError } = await supabase
            //   .from('goal_milestone_notifications')
            //   .insert({ goal_id: goal.id, user_id: user.id, milestone_percentage: milestone });

            // if (insertError) {
            //   console.error('Error logging milestone notification:', insertError);
            // }
          // } else {
          //   console.log(`    - Existing notification found. Skipping.`);
          // }
        }
      }
    }

    return NextResponse.json({ message: `Goal check complete. ${notificationsCreated} notifications created.` });

  } catch (error) {
    console.error('Error in goal notification check:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
