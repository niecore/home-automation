import { booleanEntityTrue$ } from "../homeassistant/entities.mjs"
import { filterByLogged } from "../utils/stream.mjs"
import { haRx } from "../homeassistant/connection.mjs"

// automation config
export const automationEnabledEntityId = automationId => "input_boolean.automations_" + automationId
export const automationEnabled$ = automationId => booleanEntityTrue$(automationEnabledEntityId(automationId))
export const filterAutomationEnabled = automationId => filterByLogged(automationId + ": enabled ", automationEnabled$(automationId))

export const enableAutomation = automationId =>  haRx.callService("input_boolean", "turn_on", {entity_id: automationEnabledEntityId(automationId)})
export const disableAutomation = automationId =>  haRx.callService("input_boolean", "turn_off", {entity_id: automationEnabledEntityId(automationId)})