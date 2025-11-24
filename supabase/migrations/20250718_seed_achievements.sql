-- Seed initial achievements and challenges

insert into public.achievements (name, description, points, icon)
values
 ('First Expense', 'Logged your first expense', 50, '/icons/achv_first_expense.svg'),
 ('Century Logger', 'Logged 100 expenses', 200, '/icons/achv_100_expenses.svg'),
 ('Saver Streak', 'Maintained a 7-day activity streak', 150, '/icons/achv_7day_streak.svg'),
 ('Budget Master', 'Stayed within budget for a full month', 300, '/icons/achv_budget_master.svg');

insert into public.challenges (title, description, target_value, metric, duration_days, points_reward)
values
 ('7-Day No-Spend', 'Spend zero discretionary money for 7 days', null, 'no_spend', 7, 150),
 ('Save $100', 'Save an additional $100 this month', 100, 'amount_saved', 30, 200);
