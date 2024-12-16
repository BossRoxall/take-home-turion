-- Create the ccsds_packets table
CREATE TABLE ccsds_packets (
   id SERIAL NOT NULL,
   apid INT NOT NULL,
   seq_flags INT NOT NULL,
   seq_count INT NOT NULL,
   timestamp TIMESTAMPTZ NOT NULL,
   subsystem_id INT NOT NULL,
   temperature FLOAT NOT NULL,
   battery FLOAT NOT NULL,
   altitude FLOAT NOT NULL,
   signal FLOAT NOT NULL,
   raw_packet BYTEA NOT NULL,
   PRIMARY KEY (timestamp, id) -- Include "timestamp" in the primary key
);

-- Convert the table to a hypertable
SELECT create_hypertable('ccsds_packets', 'timestamp');

-- Add indexes for frequently queried columns
CREATE INDEX idx_ccsds_packets_apid ON ccsds_packets (apid, timestamp); -- Include timestamp in the index
CREATE INDEX idx_ccsds_packets_temperature ON ccsds_packets (temperature, timestamp);
CREATE INDEX idx_ccsds_packets_battery ON ccsds_packets (battery, timestamp);
CREATE INDEX idx_ccsds_packets_altitude ON ccsds_packets (altitude, timestamp);
CREATE INDEX idx_ccsds_packets_signal ON ccsds_packets (signal, timestamp);