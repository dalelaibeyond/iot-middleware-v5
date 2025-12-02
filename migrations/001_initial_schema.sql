-- IoT Middleware V5 - Initial Database Schema
-- Database: iot_middleware

CREATE DATABASE IF NOT EXISTS iot_middleware;

USE iot_middleware;

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL,
  device_type CHAR(5) NOT NULL, -- "V5008" or "V6800" or "G6000"
  module_number INT, -- U-Sensor Module identifier (1-5 for V5008, 1-24 for V6800)
  module_id VARCHAR(32), -- U-Sensor Module ID
  sensor_type VARCHAR(32), -- "USENSOR","TEMP_HUM","NOISE","DOOR","DEVICE","MODULE"
  msg_type VARCHAR(32) NOT NULL, -- "HEARTBEAT","RFID","TEMP_HUM","NOISE","DOOR","QRY_RFID","QRY_TEMP_HUM","QRY_NOISE","QRY_DOOR_STATE","QRY_DEVICE","QRY_MODULE","SET_COLOR","CLR_ALARM"
  payload JSON,
  meta JSON,
  ts DATETIME NOT NULL, -- This stores the actual timestamp from the device/message
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- This is when the record was inserted into the database
);

-- Create indexes for performance optimization
CREATE INDEX idx_device_id ON sensor_data(device_id);
CREATE INDEX idx_device_type ON sensor_data(device_type);
CREATE INDEX idx_ts ON sensor_data(ts);
CREATE INDEX idx_device_type_ts ON sensor_data(device_type, ts);