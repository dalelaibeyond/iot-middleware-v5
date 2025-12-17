-- IoT Middleware V5 - Create Unified Data Table
-- Database: iot_middleware

USE iot_middleware;

-- Create unified data table for hybrid storage model
CREATE TABLE IF NOT EXISTS iot_unified_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- 1. Identity (The "Who")
    device_id VARCHAR(32) NOT NULL,        -- Gateway ID (e.g., "2437871205")
    device_type VARCHAR(10) NOT NULL,      -- "V5008", "V6800"
    
    -- 2. Physical Hierarchy (The "Where" - crucial for query logic)
    module_index INT DEFAULT 0,            -- V5008 modAddr (1-5). 0 if not applicable.
    sensor_index INT DEFAULT 0,            -- The "Grain". 
                                       -- For Temp: sensorAddr (10-15). 
                                       -- For U-Level: uPos (1-54).
                                       -- For Noise: sensorAddr (16-18).
    
    -- 3. Classification (The "What")
    message_class VARCHAR(20) NOT NULL,    -- "TELEMETRY", "EVENT", "STATE", "ALARM"
    data_key VARCHAR(32) NOT NULL,         -- "temperature", "humidity", "noise", "door", "rfid_map"
    
    -- 4. The Value (Hybrid Approach)
    num_value DOUBLE,                      -- For aggregations (Temp, Hum, Noise, Battery)
    str_value VARCHAR(255),                -- For simple states ("OPEN", "CLOSED", TagID)
    json_value JSON,                       -- For complex maps (Full RFID list, Raw Meta)
    
    -- 5. Time
    ts_device DATETIME(3),                 -- When the sensor actually read the data
    ts_server DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),    -- When it hit the DB
    
    -- 6. Metadata
    message_id VARCHAR(32),               -- Original message ID for tracing
    raw_message TEXT,                      -- Raw hex message for debugging
    
    -- 7. Indexes
    INDEX idx_device_hierarchy (device_id, module_index, sensor_index),
    INDEX idx_device_class_key (device_id, message_class, data_key),
    INDEX idx_device_time (device_id, ts_device),
    INDEX idx_server_time (ts_server),
    INDEX idx_device_type (device_type)
);

-- Create additional indexes for performance
CREATE INDEX idx_module_index ON iot_unified_data(module_index);
CREATE INDEX idx_sensor_index ON iot_unified_data(sensor_index);
CREATE INDEX idx_message_class ON iot_unified_data(message_class);
CREATE INDEX idx_data_key ON iot_unified_data(data_key);
CREATE INDEX idx_num_value ON iot_unified_data(num_value);

-- Composite indexes for common query patterns
CREATE INDEX idx_search ON iot_unified_data(device_id, module_index, data_key, ts_device);
CREATE INDEX idx_telemetry ON iot_unified_data(device_id, message_class, ts_device) WHERE message_class = 'TELEMETRY';
CREATE INDEX idx_events ON iot_unified_data(device_id, message_class, ts_device) WHERE message_class IN ('EVENT', 'ALARM');