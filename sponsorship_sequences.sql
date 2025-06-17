-- SQL to create the sponsorship_sequences table for 10 slots, each row represents a slot in the sequence
CREATE TABLE IF NOT EXISTS sponsorship_sequences (
    id BIGSERIAL PRIMARY KEY,
    slot INT NOT NULL CHECK (slot >= 1 AND slot <= 10),
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('product','note','room')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- You can add a unique constraint so only one sequence per slot per run if desired.
 