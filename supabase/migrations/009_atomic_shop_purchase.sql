-- Migration 009: Atomic shop purchase function
-- Problem: XP deduction for avatar/theme purchases was done client-side,
--          allowing students to manipulate XP via DevTools.
-- Fix: Server-side function that atomically checks XP balance, deducts cost,
--      and adds the item to the user's unlocked list.

CREATE OR REPLACE FUNCTION public.purchase_item(
  item_type TEXT,       -- 'avatar', 'theme', 'frame', 'title', 'power_up'
  item_id TEXT,         -- the item identifier (emoji for avatars, id for themes, etc.)
  item_cost INTEGER     -- the XP cost
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_xp INTEGER;
  current_list JSONB;
  column_name TEXT;
  user_row RECORD;
BEGIN
  -- Determine which column to update
  CASE item_type
    WHEN 'avatar' THEN column_name := 'unlocked_avatars';
    WHEN 'theme' THEN column_name := 'unlocked_themes';
    WHEN 'frame' THEN column_name := 'unlocked_frames';
    WHEN 'title' THEN column_name := 'unlocked_titles';
    WHEN 'power_up' THEN column_name := 'power_ups';
    ELSE RETURN json_build_object('success', false, 'error', 'Invalid item type');
  END CASE;

  -- Lock the user row to prevent race conditions
  SELECT * INTO user_row FROM public.users WHERE uid = auth.uid()::text FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  current_xp := COALESCE(user_row.xp, 0);

  -- Check balance
  IF current_xp < item_cost THEN
    RETURN json_build_object('success', false, 'error', 'Not enough XP');
  END IF;

  -- For power_ups, increment the count in the JSONB object
  IF item_type = 'power_up' THEN
    current_list := COALESCE(user_row.power_ups, '{}'::jsonb);
    UPDATE public.users
      SET xp = current_xp - item_cost,
          power_ups = jsonb_set(current_list, ARRAY[item_id], to_jsonb(COALESCE((current_list->>item_id)::int, 0) + 1))
      WHERE uid = auth.uid()::text;
  ELSE
    -- For other items, append to the text array
    EXECUTE format(
      'UPDATE public.users SET xp = $1, %I = array_append(COALESCE(%I, ARRAY[]::text[]), $2) WHERE uid = $3',
      column_name, column_name
    ) USING current_xp - item_cost, item_id, auth.uid()::text;
  END IF;

  RETURN json_build_object('success', true, 'new_xp', current_xp - item_cost);
END;
$$;
