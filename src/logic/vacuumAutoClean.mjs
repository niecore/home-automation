import { entityState$ } from "../homeassistant/entities.mjs"
import { startVacuum } from "../domains/vacuum.mjs"
import { awayState$ } from "./awayMode.mjs"
import { filterAutomationEnabled } from "../domains/automations.mjs"
import { filterByLogged } from "../utils/stream.mjs"

// vacuum
const isOlderThanToday = date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

const cleanRequired$ = entityState$("sensor.roborock_vacuum_s6_last_clean_end")
    .map(Date.parse)
    .map(isOlderThanToday)

const vacuumAutoCleanId = "vacuum_auto_clean"

awayState$
    .thru(filterAutomationEnabled(vacuumAutoCleanId))
    .thru(filterByLogged(`${vacuumAutoCleanId} clean required`, cleanRequired$))
    .onValue(_ => startVacuum("vacuum.roborock_vacuum_s6"))