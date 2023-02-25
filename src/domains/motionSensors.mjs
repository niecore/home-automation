import * as R from "ramda"
import { anyBooleanEntityTrue$, isEntityType, hasDeviceClass } from "../homeassistant/entities.mjs"
import { debounceValue } from "../utils/stream.mjs"
import { minutes } from "../utils/duration.mjs"

export const isMotionSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("occupancy")])

export const motionDetected$ = entityId => anyBooleanEntityTrue$(entityId)
    .thru(debounceValue(false, minutes(5)))

export const motionGone$ = entityId => motionDetected$(entityId).map(R.not)
