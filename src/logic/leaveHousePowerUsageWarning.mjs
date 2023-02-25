import * as R from "ramda"

import { entityState$ } from "../homeassistant/entities.mjs"
import { awayState$ } from "./awayMode.mjs"
import { notify } from "../domains/notify.mjs"
import { numericMeanRolling } from "../utils/stream.mjs"
import { seconds } from "../utils/duration.mjs"

const meanPowerUsage$ = entityState$("sensor.tasmota_mt681_power_cur")
    .thru(numericMeanRolling(seconds(30)))

meanPowerUsage$.sampledBy(awayState$)
    .filter(R.lt(1000))
    .map(meanPowerUsage => `Warning: you are about the leave the house but it seems like some devices are running. Power consumption is: ${meanPowerUsage}`)
    .onValue(notify)
