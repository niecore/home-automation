import { inputSelectState$ } from "../homeassistant/entities.mjs"
import { turnWakeUpLightOn, turnLightsOff } from "../domains/lights.mjs"

const wakeupLights = ["light.lightbulb_tradfriw_8", "light.lightbulb_tradfriw_9"]
inputSelectState$("waking_up", "input_select.sleep_state")
    .onValue(_ => turnWakeUpLightOn(wakeupLights))

inputSelectState$("awake", "input_select.sleep_state")
    .onValue(_ => turnLightsOff(wakeupLights))