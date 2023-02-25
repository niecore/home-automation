import * as R from 'ramda'

import { filterAutomationEnabled } from '../domains/automations.mjs'
import { isLight, turnLightsOff } from '../domains/lights.mjs'
import { isMotionSensor, motionGone$ } from '../domains/motionSensors.mjs'
import { rooms, inRoom } from '../domains/rooms.mjs'
import { home } from '../domains/home.mjs'
import { entityId } from '../homeassistant/entities.mjs'
import { streamLogger } from '../utils/logger.mjs'
import { minutes } from '../utils/duration.mjs'
import { debounceValue } from '../utils/stream.mjs'

rooms.forEach(room => {
    const lightShutOffTimeout = minutes(90);
    const automationId = "light_power_safe";

    const lightsInRoom = home
        .filter(isLight)
        .filter(inRoom(room))
        .map(entityId)

    const motionSensorInRoom = home
        .filter(isMotionSensor)
        .filter(inRoom(room))
        .map(entityId)

    const motionGoneInAreaTooLong$ = motionGone$(motionSensorInRoom)
        .thru(debounceValue(true, lightShutOffTimeout))
        .onValue(streamLogger(`${automationId} ${room}: motion gone too long`))

    lightsInRoom.forEach(light => {
        const lightOnTooLong$ = entityState$(light)
            .map(binarayStringToBoolean)
            .thru(debounceValue(true, lightShutOffTimeout))
            .onValue(streamLogger(`${automationId} ${room} ${light}: light on too long`))
        
        // trigger when light on too long and motion gone too long
        lightOnTooLong$.combine(motionGoneInAreaTooLong$, R.and)
            .filter(R.equals(true))
            .thru(filterAutomationEnabled(automationId))
            .onValue(streamLogger(`${automationId} turning light off ${light}`))
            .onValue(_ => turnLightsOff([light])) // todo add warning of shutoff via blink

    })
});