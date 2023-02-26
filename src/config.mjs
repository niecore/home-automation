import dotenv from 'dotenv';

dotenv.config();

export const homeassistantHost = process.env.HOMEASSISTANT_HOST || 'localhost';
export const homeassistantPort = process.env.HOMEASSISTANT_PORT || 8123;
export const homeassistantToken = process.env.HOMEASSISTANT_TOKEN;