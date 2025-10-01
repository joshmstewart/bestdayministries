-- Add visible_to_roles column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS visible_to_roles user_role[] DEFAULT ARRAY['caregiver'::user_role, 'bestie'::user_role, 'supporter'::user_role, 'admin'::user_role, 'owner'::user_role];

COMMENT ON COLUMN events.visible_to_roles IS 'Array of user roles that can view this event. Defaults to all roles.';