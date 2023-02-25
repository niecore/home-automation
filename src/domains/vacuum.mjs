import { haRx } from "../homeassistant/connection.mjs"

export const startVacuum = entityId =>  haRx.callService("vacuum", "start", { entity_id: entityId })
