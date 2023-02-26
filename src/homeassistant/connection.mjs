import homeassistantRx from "homeassistant-rx";
import { homeassistantHost, homeassistantPort, homeassistantToken } from "../config.mjs";

export const haRx = homeassistantRx({
    hostname: homeassistantHost,
    port: homeassistantPort,
    accessToken: homeassistantToken
});

await haRx.connect();

export const state = await haRx.getStates()
export const areas = await haRx.getAreaRegistry()
export const devices = await haRx.getDeviceRegistry()
export const entities = await haRx.getEntityRegistry()
export const config = await haRx.getConfig()