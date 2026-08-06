-- ---------------------------------------------------------------------
-- The one genuinely new field for custom goals.
--
-- "Each blanket keeps someone warm this winter" — a single sentence that
-- says what one unit means to a person. Distinct from `story`, which is a
-- paragraph of context, and from `headline`, which is the invitation.
--
-- Deliberately NOT added: mission_type, unit_label, unit_icon,
-- impact_multiplier. Those names appear in the v4 brief but every one of
-- them already has an equivalent here — template_id (null means custom),
-- unit_singular/unit_plural, icon, and lives_per_unit respectively.
-- Adding them would leave two columns meaning the same thing and no rule
-- about which one wins.
-- ---------------------------------------------------------------------

alter table public.missions
  add column if not exists impact_line text;
