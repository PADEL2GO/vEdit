-- Add STREAK_MILESTONE reward definitions with correct category
INSERT INTO public.reward_definitions (key, category, title, description, points_rule, awarding_mode, approval_required, is_active, display_rule_text)
VALUES 
  ('STREAK_5_WEEKS', 'loyalty_retention', 'Streak Milestone: 5 Wochen', 'Bonus für 5 Wochen in Folge gebucht', '{"type": "fixed", "value": 50}'::jsonb, 'AUTO_CLAIM', false, true, '5 Wochen in Folge buchen'),
  ('STREAK_10_WEEKS', 'loyalty_retention', 'Streak Milestone: 10 Wochen', 'Bonus für 10 Wochen in Folge gebucht', '{"type": "fixed", "value": 100}'::jsonb, 'AUTO_CLAIM', false, true, '10 Wochen in Folge buchen')
ON CONFLICT (key) DO NOTHING;