import * as R from "ramda"

import { entityState$ } from "../homeassistant/entities.mjs"
import { filterStreamByValue } from "../utils/stream.mjs"

export const tradfriRemote = R.pipe(
    entityState$,
    R.applySpec({
        toggle$: filterStreamByValue("toggle"),
        arrowLeftClick$: filterStreamByValue("arrow_left_click"),
        arrowRightClick$: filterStreamByValue("arrow_right_click"),
        brightnessDownClick$: filterStreamByValue("brightness_down_click"),
        brightnessUpClick$: filterStreamByValue("brightness_up_click")
    })    
)

export const tradfriRemoteSmall = R.pipe(
    entityState$,
    R.applySpec({
        on$: filterStreamByValue("on"),
        off$: filterStreamByValue("off")
    })
)

export const aqaraTwoChannelSwitch = R.pipe(
    entityState$,
    R.applySpec({
        single_left$: filterStreamByValue("single_left"),
        single_right$: filterStreamByValue("single_right")
    })
)