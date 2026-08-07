-- ---------------------------------------------------------------------
-- Fundraising missions: "₨50,000 to support a family".
--
-- A mission whose unit is money rather than meals or trees. `currency`
-- being set is what makes a mission a fundraiser — no separate type
-- column, because the distinction is entirely "is the goal an amount".
--
-- Asar still never touches the money and still stores no payment
-- details: there is deliberately no account-number column here. The
-- owner shares where to send it privately, or through the existing
-- moderated external_links flow. This migration adds a goal and a
-- beneficiary, nothing else.
-- ---------------------------------------------------------------------

alter table public.missions
  -- ISO 4217, e.g. PKR / USD / GBP. Null means this is not a fundraiser.
  add column if not exists currency text,
  -- Who the money is for, in the owner's own words: "a family in Lahore",
  -- "a student finishing her degree". Free text on purpose — the honest
  -- description is the owner's, not a category we invented.
  add column if not exists beneficiary text;

alter table public.missions
  drop constraint if exists missions_currency_format;
alter table public.missions
  add constraint missions_currency_format
  check (currency is null or currency ~ '^[A-Z]{3}$');
