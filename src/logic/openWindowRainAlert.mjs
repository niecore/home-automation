import * as R from "ramda"
import { entityId, anyBooleanEntityTrue$, entityState$ } from "../homeassistant/entities.mjs"
import { home } from "../domains/home.mjs"
import { isWindowSensor } from "../domains/windowSensors.mjs"
import { inRoom } from "../domains/rooms.mjs"
import { notify } from "../domains/notify.mjs"
import { filterAutomationEnabled } from "../domains/automations.mjs"
import { streamLogger } from "../utils/logger.mjs"
import { filterByLogged } from "../utils/stream.mjs"

// open window rain alert
const roofWindowEntites = home
    .filter(isWindowSensor)
    .filter(R.anyPass([inRoom("laundryroom"), inRoom("guestroom")]))
    .map(entityId)

const roofWindowOpen$ = anyBooleanEntityTrue$(roofWindowEntites)
const weatherForacest$ = entityState$("weather.home_hourly").skipDuplicates()
const rainForecast$ = weatherForacest$.filter(R.equals("rainy"))
const windowRainAlertId = "open_window_rain_alert"

rainForecast$
    .onValue(streamLogger(`${windowRainAlertId} rain predicted`))
    .thru(filterByLogged(`${windowRainAlertId} roof windows open`, roofWindowOpen$))
    .thru(filterAutomationEnabled(windowRainAlertId))
    .onValue(_ => notify("rain predicted and roof windows open"))