-- Additional achievements and challenges seed

insert into public.achievements (name, description, points, icon)
values
 ('Income Earner', 'Recorded first income entry', 50, '/icons/achv_first_income.svg'),
 ('Debt Destroyer', 'Made first debt payment', 75, '/icons/achv_first_debt_payment.svg'),
 ('Goal Getter', 'Completed first financial goal milestone', 100, '/icons/achv_goal_milestone.svg'),
 ('Subscription Slayer', 'Cancelled a recurring subscription', 80, '/icons/achv_subscription_cancel.svg'),
 ('High Roller', 'Logged an expense over $1000', 120, '/icons/achv_high_expense.svg'),
 ('Net Worth Hero', 'Reached a net worth of $10,000', 300, '/icons/achv_networth_10k.svg'),
 ('Consistency Champ', 'Logged in 7 days in a row', 150, '/icons/achv_7_day_streak.svg'),
 ('Budget Boss', 'Created and used 3 budgets', 90, '/icons/achv_budget_boss.svg'),
 ('Bill Buster', 'Paid all bills on time for a month', 100, '/icons/achv_bill_buster.svg'),
 ('Investor Alert', 'Logged your first investment', 60, '/icons/achv_first_investment.svg');

insert into public.challenges (title, description, target_value, metric, duration_days, points_reward)
values
 ('Log 20 Expenses', 'Track 20 expenses this week', 20, 'expense_count', 7, 200),
 ('Pay $500 Debt', 'Reduce total debt by $500 this month', 500, 'debt_paid', 30, 300),
 ('Save $5000', 'Increase net worth by $5,000 in 6 months', 5000, 'net_worth_increase', 180, 1000),
 ('Streak Starter', 'Use the app every day for 5 days', 5, 'daily_login', 5, 150),
 ('Bill Master', 'Pay at least 5 different bills this month', 5, 'bills_paid', 30, 250),
 ('Subscription Cleanse', 'Cancel 2 or more subscriptions this month', 2, 'subscriptions_cancelled', 30, 200),
 ('Goal Tracker', 'Update goal progress at least 4 times this month', 4, 'goal_updates', 30, 180),
 ('Track It All', 'Log income, expense, bill, and debt in one week', 4, 'unique_activity_types', 7, 250);
