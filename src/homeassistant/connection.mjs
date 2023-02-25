import homeassistantRx from "homeassistant-rx";

export const haRx = homeassistantRx({
    hostname: "192.168.0.101",
    port: 8123,
    accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzYjE3ZTM3MmNiZjQ0ZjE4YjY4NjAzOTU5ZGM4ZWJkNSIsImlhdCI6MTYzOTIzNDIyOCwiZXhwIjoxOTU0NTk0MjI4fQ.mkVAPURGx9FhE0s3s4K6F_mPZ2W0ij8i8O6gBeJMGxA"
});

await haRx.connect();

export const state = await haRx.getStates()
export const areas = await haRx.getAreaRegistry()
export const devices = await haRx.getDeviceRegistry()
export const entities = await haRx.getEntityRegistry()
export const config = await haRx.getConfig()