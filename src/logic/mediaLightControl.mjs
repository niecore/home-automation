import * as R from "ramda";

import { mediaOn$ } from "./mediaStandby.mjs";
import { booleanEntityTrue$ } from "../homeassistant/entities.mjs";
import { filterAutomationEnabled } from "../domains/automations.mjs";
import { turnLightsOff } from "../domains/lights.mjs";
import { filterByLogged } from "../utils/stream.mjs";
import { seconds } from "../utils/duration.mjs";

const mediaAutomationId = "forbid_lights_when_tv_on";
mediaOn$
    .filter(R.equals(true))
    .thru(filterAutomationEnabled(mediaAutomationId))
    .onValue(_ => turnLightsOff(["light.shellydimmer_db338b"]))

booleanEntityTrue$("light.shellydimmer_db338b")
    .thru(filterAutomationEnabled(mediaAutomationId))
    // light turned on
    .filter(R.equals(true))
    // check if tv on
    .thru(filterByLogged(`${mediaAutomationId} tv turned on`, mediaOn$))
    // when light is turned on again within 10 seconds, dont proceed
    .throttle(seconds(10), {leading: true, trailing: false})
    // turn light off :D
    .onValue(_ => turnLightsOff("light.shellydimmer_db338b"))
