import * as R from "ramda";

import { filterAutomationEnabled } from "../domains/automations.mjs";
import { notify } from "../domains/notify.mjs";
import { allWindowContactSensors } from "../domains/windowSensors.mjs";
import { entity$, friendlyName, entityId } from "../homeassistant/entities.mjs";
import { minutes } from "../utils/duration.mjs";

// open window alert
const openWindowAlertId = "open_window_alert";
allWindowContactSensors.forEach(sensor => {
    entity$(sensor)
        .debounce(minutes(10))
        .filter(R.propEq("state", "on"))
        .thru(filterAutomationEnabled(openWindowAlertId))
        .onValue(ev => notify(`window open for longer than 10 minutes: ${friendlyName(ev)}`))
});