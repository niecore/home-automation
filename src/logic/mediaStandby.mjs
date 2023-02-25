import * as R from "ramda"

import { entityState$ } from "../homeassistant/entities.mjs"
import { switchTurnOff, switchTurnOn } from "../homeassistant/services.mjs"
import { streamLogger } from "../utils/logger.mjs"
import { minutes } from "../utils/duration.mjs"

// media automation scenes
export const mediaOn$ = entityState$("select.harmony_hub_activities")
    .onValue(streamLogger(`media activity`))    
    .map(R.equals("power_off"))
    .map(R.not)
    
// toggle smart plug with harmony one activities
mediaOn$  
    .filter(R.equals(true))
    .onValue(streamLogger(`media activity started, turn on plug`))
    .onValue(_ => switchTurnOn("switch.plug_osram_2"))
    
mediaOn$
    .debounce(minutes(2))
    .filter(R.equals(false))
    .onValue(streamLogger(`media activity stopped, turn off plug`))
    .onValue(_ => switchTurnOff("switch.plug_osram_2"))

