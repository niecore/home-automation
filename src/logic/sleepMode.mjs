import * as R from "ramda"
import { entityId, anyBooleanEntityTrue$, entityState$, inputSelectState$ } from "../homeassistant/entities.mjs"
import { inputSelectOption } from "../homeassistant/services.mjs"
import { home } from "../domains/home.mjs"
import { inRoom, notInRoom } from "../domains/rooms.mjs"
import { turnLightsOff, isLight } from '../domains/lights.mjs'
import { disableAutomation, enableAutomation } from "../domains/automations.mjs"
import { isMotionSensor } from "../domains/motionSensors.mjs"
import { tradfriRemoteSmall } from "../domains/remotes.mjs"

// sleep state automations
const sleepStateRemote = tradfriRemoteSmall("sensor.remote_tradfri_small_1_action")
sleepStateRemote.on$
    .onValue(_ => inputSelectOption("input_select.sleep_state", "awake"))

sleepStateRemote.off$
    .onValue(_ => inputSelectOption("input_select.sleep_state", "sleeping"))

const lightsNotInBedroom = home
    .filter(isLight)
    .filter(notInRoom("bedroom"))
    .map(entityId)
    
inputSelectState$("sleeping", "input_select.sleep_state")
    .onValue(_ => disableAutomation("motionlight_staircase"))
    .onValue(_ => disableAutomation("motionlight_bedroom"))
    .onValue(_ => disableAutomation("motionlight_bathroom"))
    .onValue(_ => turnLightsOff(lightsNotInBedroom))

inputSelectState$("awake", "input_select.sleep_state")
    .onValue(_ => enableAutomation("motionlight_staircase"))
    .onValue(_ => enableAutomation("motionlight_bedroom"))
    .onValue(_ => enableAutomation("motionlight_bathroom"))
    
const motionsensorsInStaircase = home
    .filter(isMotionSensor)
    .filter(inRoom("staircase"))
    .map(entityId)

const inWakeUpState = entityState$("input_select.sleep_state")
    .map(R.equals("waking_up"))

anyBooleanEntityTrue$(motionsensorsInStaircase)
    .filter(R.equals(true))
    .filterBy(inWakeUpState)
    .onValue(_ => inputSelectOption("input_select.sleep_state", "awake"))        