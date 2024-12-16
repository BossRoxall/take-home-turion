-- Drop indexes first to ensure no orphaned indexes are left
DROP INDEX IF EXISTS idx_ccsds_packets_apid;
DROP INDEX IF EXISTS idx_ccsds_packets_timestamp;
DROP INDEX IF EXISTS idx_ccsds_packets_temperature;
DROP INDEX IF EXISTS idx_ccsds_packets_battery;
DROP INDEX IF EXISTS idx_ccsds_packets_altitude;
DROP INDEX IF EXISTS idx_ccsds_packets_signal;

-- Drop the hypertable explicitly
SELECT drop_chunks('ccsds_packets', now()); -- Remove chunks first if needed
DROP TABLE IF EXISTS ccsds_packets CASCADE;