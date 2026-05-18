-- =============================================================================
-- Tier 1 step 4 — seed a starter floor map + venue tables for your real venue
-- =============================================================================
-- The Tier-1 bootstrap created the `floor_plans` / `floor_plan_rooms` /
-- `venue_tables` tables, but for your venue
-- (b43c7b1e-db17-44e8-8519-7cb290607443) they are still empty, so the Floor
-- Map renders only the static markers (DJ / Bar / Entry) and no table tiles.
-- This script seeds a published starter map so the new occupancy derivation
-- has tiles to color in.
--
-- IMPORTANT — labels match `FloorMapPreview.defaultTablePositions` (the web
-- portal uses a hardcoded position lookup keyed by label, so we MUST use
-- 'T1'..'T6' and 'VIP 1'..'VIP 3' verbatim — anything else will render at
-- the same fallback coordinates and overlap).
--
-- Idempotent: re-running won't duplicate tables. Safe to run multiple times.
-- Apply on the production project (ref: swbjxienxrptmawsdugv) via the Supabase
-- SQL editor.
-- =============================================================================

-- 0) Natural key on (venue_id, label) so the seed is genuinely idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_tables_venue_label
    ON public.venue_tables (venue_id, label);

BEGIN;

-- 1) Ensure floor_plans + floor_plan_rooms exist for the venue.
WITH target AS (
    SELECT 'b43c7b1e-db17-44e8-8519-7cb290607443'::uuid AS venue_id
), upsert_plan AS (
    INSERT INTO public.floor_plans (venue_id, name, is_published, is_draft)
    SELECT target.venue_id, 'Main floor', true, false
      FROM target
     WHERE NOT EXISTS (
        SELECT 1 FROM public.floor_plans fp WHERE fp.venue_id = target.venue_id
     )
    RETURNING id, venue_id
), plan AS (
    SELECT id, venue_id FROM upsert_plan
    UNION ALL
    SELECT fp.id, fp.venue_id
      FROM public.floor_plans fp
      JOIN target ON target.venue_id = fp.venue_id
     WHERE NOT EXISTS (SELECT 1 FROM upsert_plan)
     LIMIT 1
), upsert_room AS (
    INSERT INTO public.floor_plan_rooms (floor_plan_id, name, sort_order)
    SELECT plan.id, 'Main Floor', 0
      FROM plan
     WHERE NOT EXISTS (
        SELECT 1 FROM public.floor_plan_rooms r WHERE r.floor_plan_id = plan.id
     )
    RETURNING id, floor_plan_id
), room AS (
    SELECT id, floor_plan_id FROM upsert_room
    UNION ALL
    SELECT r.id, r.floor_plan_id
      FROM public.floor_plan_rooms r
      JOIN plan ON plan.id = r.floor_plan_id
     WHERE NOT EXISTS (SELECT 1 FROM upsert_room)
     LIMIT 1
)
-- 2) Tables — labels MUST match defaultTablePositions in FloorMapPreview.tsx.
--    element_data is set for forward-compatibility with the editor's save
--    path, but the preview reads positions from its hardcoded map.
INSERT INTO public.venue_tables (
    venue_id, floor_plan_id, room_id,
    label, table_type, capacity, base_price, min_spend,
    deposit_percent, color, zone, status, element_data
)
SELECT
    plan.venue_id, plan.id, room.id,
    t.label, t.table_type, t.capacity, t.base_price, t.min_spend,
    20, t.color, 'main', 'active',
    jsonb_build_object(
        'position', jsonb_build_object(
            'x', t.x, 'y', t.y, 'width', t.width, 'height', t.height, 'rotation', 0
        ),
        'shape', t.shape,
        'userAppZoom', 1.0
    )
  FROM plan
  JOIN room ON room.floor_plan_id = plan.id
  CROSS JOIN (
      VALUES
        -- label,    type,       cap, base,  min,  color,  x,   y,   w,   h,   shape
        ('T1',       'table',     4,  1000,  500, 'teal',   50,  80,  70,  70, 'circle'),
        ('T2',       'table',     4,  1000,  500, 'teal',  160,  80,  70,  70, 'circle'),
        ('T3',       'table',     4,  1000,  500, 'teal',  270,  80,  70,  70, 'circle'),
        ('T4',       'table',     6,  1500,  750, 'teal',  380,  80,  70,  70, 'circle'),
        ('T5',       'table',     6,  1500,  750, 'teal',  490,  80,  70,  70, 'circle'),
        ('T6',       'table',     4,  1000,  500, 'teal',   50, 180,  70,  70, 'circle'),
        ('VIP 1',    'vip_area',  8,  3500, 2000, 'gold',   50, 280, 120,  80, 'rect'),
        ('VIP 2',    'vip_area',  8,  3500, 2000, 'gold',  200, 280, 120,  80, 'rect'),
        ('VIP 3',    'vip_area', 10,  5000, 2500, 'gold',  350, 280, 120,  80, 'rect')
  ) AS t(label, table_type, capacity, base_price, min_spend, color, x, y, width, height, shape)
ON CONFLICT (venue_id, label) DO NOTHING;

COMMIT;

-- 3) Quick verification — should show 9 active tables for the venue.
SELECT label, table_type, capacity, base_price, status
  FROM public.venue_tables
 WHERE venue_id = 'b43c7b1e-db17-44e8-8519-7cb290607443'::uuid
 ORDER BY label;

NOTIFY pgrst, 'reload schema';
