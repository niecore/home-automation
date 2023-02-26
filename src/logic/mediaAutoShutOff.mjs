import { entityId } from "../homeassistant/entities.mjs";
import { selectOption } from "../homeassistant/services.mjs";
import { home } from "../domains/home.mjs";
import { inRoom } from "../domains/rooms.mjs";
import { isMotionSensor, motionGone$ } from "../domains/motionSensors.mjs";
import { filterAutomationEnabled } from "../domains/automations.mjs";
import { debounceValue } from "../utils/stream.mjs";
import { minutes } from "../utils/duration.mjs";
import { streamLogger } from "../utils/logger.mjs";

const motionsensorsInLivingRoom = home
    .filter(isMotionSensor)
    .filter(inRoom("livingroom"))
    .map(entityId)

const mediaAutoOffAutomationId = "media_auto_off";

motionGone$(motionsensorsInLivingRoom)
    .thru(debounceValue(true, minutes(30)))
    .thru(filterAutomationEnabled(mediaAutoOffAutomationId))
    .onValue(streamLogger(`${mediaAutoOffAutomationId}: media on for 30 minutes without movement, turning device off`))
    .onValue(_ => selectOption("select.harmony_hub_activities", "power_off"))