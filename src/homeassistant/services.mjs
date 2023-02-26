import { haRx } from "../homeassistant/connection.mjs"

// switch
export const switchTurnOn = entityId => haRx.callService("switch", "turn_on", { entity_id: entityId })
export const switchTurnOff = entityId => haRx.callService("switch", "turn_off", { entity_id: entityId })

// input select
export const inputSelectOption = (entityId, option) => haRx.callService("input_select", "select_option", { entity_id: entityId }, { option: option})
export const selectOption = (entityId, option) => haRx.callService("select", "select_option", { entity_id: entityId }, { option: option})

// input boolean
export const turnOn = entityId =>  haRx.callService("input_boolean", "turn_on", {entity_id: entityId})
export const turnOff = entityId =>  haRx.callService("input_boolean", "turn_off", {entity_id: entityId})