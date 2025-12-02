-- IoT Middleware V5 - Additional Indexes for Performance
-- Database: iot_middleware

USE iot_middleware;

-- Additional performance indexes
CREATE INDEX idx_module_number ON sensor_data(module_number);
CREATE INDEX idx_module_id ON sensor_data(module_id);
CREATE INDEX idx_sensor_type ON sensor_data(sensor_type);
CREATE INDEX idx_msg_type ON sensor_data(msg_type);
CREATE INDEX idx_created_at ON sensor_data(created_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_device_sensor ON sensor_data(device_id, sensor_type);
CREATE INDEX idx_device_ts_range ON sensor_data(device_id, ts, created_at);
CREATE INDEX idx_device_type_sensor ON sensor_data(device_type, sensor_type);

-- Full-text search index for payload (if needed for future analytics)
-- Note: This requires MySQL 5.7+ and may impact performance
-- ALTER TABLE sensor_data ADD FULLTEXT(payload_ft) WITH PARSER ngram;
-- CREATE INDEX idx_payload_ft ON sensor_data(payload_ft);