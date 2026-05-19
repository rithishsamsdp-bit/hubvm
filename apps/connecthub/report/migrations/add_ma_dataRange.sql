-- Migration: Add ma_dataRange column to p_mailAutomation table
-- This column stores the data range preference for Daily schedule automations
-- Values: 'previous_day' (default), 'month_to_date'

ALTER TABLE p_mailAutomation 
ADD COLUMN ma_dataRange VARCHAR(50) DEFAULT 'previous_day' AFTER ma_day;
