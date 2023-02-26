import { getMemebersOfGroups } from "../homeassistant/groups.mjs"
import { tradfriRemoteSmall } from "../domains/remotes.mjs" 
import { switchLightsWithEvents } from "./lightControl.mjs"
import { sunset$ } from "../homeassistant/triggers.mjs"
import { hours } from "../utils/duration.mjs"

// christmas lights
const christmasLights = getMemebersOfGroups("group.christmas_lights")
const christmasRemote = tradfriRemoteSmall("sensor.remote_tradfri_small_3_action")
const christmasAutomationId = "christmas_lights"

// turn christmas lights on after sunset and leave on for 5 hours
sunset$
    .thru(filterAutomationEnabled(christmasAutomationId))
    .onValue(_ => turnLightsOn(christmasLights))
    .delay(hours(5))
    .onValue(_ => turnLightsOff(christmasLights))

// manually control christmas lights with remote
switchLightsWithEvents(christmasRemote.on$, christmasRemote.off$, christmasLights)
