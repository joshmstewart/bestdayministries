-- Keep legacy profiles.coins and newer profiles.coin_balance in sync
-- This prevents UI drift when different systems update different columns.

CREATE OR REPLACE FUNCTION public.sync_profile_coin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.coin_balance := COALESCE(NEW.coin_balance, COALESCE(NEW.coins, 0));
    NEW.coins := COALESCE(NEW.coins, NEW.coin_balance);

    -- If both were provided but differ, prefer coin_balance
    IF NEW.coins IS DISTINCT FROM NEW.coin_balance THEN
      NEW.coins := NEW.coin_balance;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.coin_balance IS DISTINCT FROM OLD.coin_balance
     AND NEW.coins IS NOT DISTINCT FROM OLD.coins THEN
    -- coin_balance changed; mirror to coins
    NEW.coins := NEW.coin_balance;
  ELSIF NEW.coins IS DISTINCT FROM OLD.coins
        AND NEW.coin_balance IS NOT DISTINCT FROM OLD.coin_balance THEN
    -- coins changed; mirror to coin_balance
    NEW.coin_balance := NEW.coins;
  ELSIF NEW.coins IS DISTINCT FROM OLD.coins
        AND NEW.coin_balance IS DISTINCT FROM OLD.coin_balance THEN
    -- both changed; keep consistent (prefer coin_balance)
    NEW.coins := NEW.coin_balance;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_coin_columns ON public.profiles;

CREATE TRIGGER sync_profile_coin_columns
BEFORE INSERT OR UPDATE OF coins, coin_balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_coin_columns();
