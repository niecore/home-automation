import * as R from "ramda"

import { inputSelectOption, switchTurnOff, switchTurnOn } from "../homeassistant/services.mjs"
import { inputSelectState$, booleanEntityTrue$, entityId } from "../homeassistant/entities.mjs"
import { aqaraTwoChannelSwitch } from "../domains/remotes.mjs"
import { turnLightsOff, allLights } from "../domains/lights.mjs"
import { seconds } from "../utils/duration.mjs"

// home state automations
export const setAtHomeState = _ => inputSelectOption("input_select.home_state", "home")
export const setAtAwayState = _ => inputSelectOption("input_select.home_state", "away")
export const awayState$ = inputSelectState$("away", "input_select.home_state")
export const homeState$ = inputSelectState$("home", "input_select.home_state")

// control away mode with remote
const leaveRemote = aqaraTwoChannelSwitch("sensor.remote_aqara_1_action")
leaveRemote.single_right$
    .debounce(seconds(30)) 
    .onValue(setAtHomeState)
    
leaveRemote.single_left$
    .onValue(setAtAwayState)

// set to home when motion detected in hall
booleanEntityTrue$("binary_sensor.motionsensor_aqara_7_occupancy")
    .filter(R.equals(true))
    .filterBy(awayState$)
    .onValue(setAtHomeState)

// turn lights off when leaving
awayState$
    .onValue(_ => turnLightsOff(allLights.map(entityId)))

// control thermostat
awayState$
    .onValue(_ => switchTurnOn("switch.away_mode"))

homeState$        
    .onValue(_ => switchTurnOff("switch.away_mode")) 
