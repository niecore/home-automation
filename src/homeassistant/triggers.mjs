import { haRx } from "../homeassistant/connection.mjs"

// sunset trigger
export const sunset$ = haRx.trigger$({
    platform: "sun",
    event: "sunset"
})