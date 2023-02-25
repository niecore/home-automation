import Kefir from "kefir"
import R from "ramda"

import { awayState$ } from "../logic/awayMode.mjs"
import { entity$, friendlyName } from "../homeassistant/entities.mjs"
import { allWindowContactSensors } from "../domains/windowSensors.mjs"
import { notify } from "../domains/notify.mjs"

const nameOfOpenWindows$ = Kefir.combine(R.map(entity$, allWindowContactSensors))
    .map(R.filter(R.propEq("state", "on")))
    .map(R.map(friendlyName))

nameOfOpenWindows$.sampledBy(awayState$)
    .filter(openWindows => openWindows.length > 0 )
    .map(openWindows => `Warning: you are about the leave the house but following windows are open: ${openWindows}`)
    .onValue(notify)