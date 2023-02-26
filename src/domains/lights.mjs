import * as R from "ramda"

import { isEntityType, anyBooleanEntityTrue$ } from "../homeassistant/entities.mjs"
import { haRx } from "../homeassistant/connection.mjs"
import { home } from "./home.mjs"

export const turnLightsOn = entityId => haRx.callService("light", "turn_on", { entity_id: entityId })
export const turnLightsOff = entityId => haRx.callService("light", "turn_off", { entity_id: entityId })
export const turnLightsOnWithBrightness = R.curry((entityId, brightness) => haRx.callService("light", "turn_on", { entity_id: entityId }, { brightness_pct: brightness }))
export const turnWakeUpLightOn = entityId => {
    turnLightsOnWithBrightness(entityId, 1)
    haRx.callService("light", "turn_on", { entity_id: entityId }, {transition: 300, brightness_pct: 100 })
}

export const isLight = isEntityType("light")
export const anyLightsOn$ = anyBooleanEntityTrue$
export const allLightsOff$ = entityIds => anyLightsOn$(entityIds).map(R.not)
export const allLights = home.filter(isLight)