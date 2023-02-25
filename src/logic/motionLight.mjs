import * as R from 'ramda'

import { entityId } from '../homeassistant/entities.mjs'
import { getEntitiesOfRoom } from '../domains/rooms.mjs'
import { isLight, turnLightsOn, turnLightsOff, allLightsOff$ } from '../domains/lights.mjs'
import { isMotionSensor, motionDetected$, motionGone$ } from '../domains/motionSensors.mjs'
import { isLuminositySensor, luminousityInRoomToLow$ } from '../domains/illuminanceSensors.mjs'
import { filterAutomationEnabled } from '../domains/automations.mjs'
import { rooms } from '../domains/rooms.mjs'
import { streamLogger } from '../utils/logger.mjs'
import { filterByLogged } from '../utils/stream.mjs'

rooms.forEach(room => {
    const entitiesInRoom = getEntitiesOfRoom(room)
    const lights = entitiesInRoom.filter(isLight).map(entityId)
    const motionSensors = entitiesInRoom.filter(isMotionSensor).map(entityId)
    const luminositySensors = entitiesInRoom.filter(isLuminositySensor).map(entityId)
    const automationId = "motionlight_" + room

    // log motion events
    motionDetected$(motionSensors)
        .onValue(streamLogger(`${automationId} motion detected`))

    // log luminosity events
    luminousityInRoomToLow$(luminositySensors)
        .onValue(streamLogger(`${automationId} luminosity to low`))

    // trigger when motion detected and luminosity to low
    motionDetected$(motionSensors).combine(luminousityInRoomToLow$(luminositySensors), R.and)
        .skipDuplicates()
        .filter(R.equals(true))
        // condition: all lights off
        .thru(filterByLogged(`${automationId} all lights off`, allLightsOff$(lights)))
        // condition: automation enabled
        .thru(filterAutomationEnabled(automationId))
        .onValue(streamLogger(`${automationId} turn lights on`))
        .onValue(_ => turnLightsOn(lights))
        .onValue(_ => {
            // turn lights off (later)
            motionGone$(motionSensors)
                // do not react on motionGone = false events
                .filter(R.equals(true))
                // turn off only once
                .take(1)
                .onValue(streamLogger(`${automationId} turn lights off`))
                .onValue(_ =>  turnLightsOff(lights))
        })
}); 