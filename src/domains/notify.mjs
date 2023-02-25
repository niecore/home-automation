import { haRx } from "../homeassistant/connection.mjs"

export const notify = message => haRx.callService("notify", "telegram_message", {}, { message: message })
