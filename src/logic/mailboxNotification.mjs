import * as R from "ramda"

import { entityState$ } from "../homeassistant/entities.mjs"
import { notify } from "../domains/notify.mjs"
import { filterAutomationEnabled } from "../domains/automations.mjs"
import { streamLogger } from "../utils/logger.mjs"
import { throttleOncePerDay } from "../utils/stream.mjs"

const mailBoxNotificationId = "mailbox_notification"
entityState$("binary_sensor.contact_aqara_4_contact")
    .filter(R.equals("on"))
    .thru(throttleOncePerDay)
    .onValue(streamLogger(`${mailBoxNotificationId}: mailbox opened`))
    .thru(filterAutomationEnabled(mailBoxNotificationId))
    .onValue(_ => notify("mailbox has been opened"))
