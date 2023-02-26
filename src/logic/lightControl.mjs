import { home } from '../domains/home.mjs'
import { tradfriRemote } from '../domains/remotes.mjs'
import { isLight, turnLightsOff, turnLightsOn, allLightsOff$, anyLightsOn$, allLights } from '../domains/lights.mjs'
import { inRoom } from '../domains/rooms.mjs'
import { entityId } from '../homeassistant/entities.mjs'

export const toggleLightsWithEvent = (toggleEvent$, lights) => {
    toggleEvent$
        .filterBy(allLightsOff$(lights))
        .onValue(_ => turnLightsOn(lights))

    toggleEvent$
        .filterBy(anyLightsOn$(lights))
        .onValue(_ => turnLightsOff(lights))
}

export const switchLightsWithEvents = (onEvent$, offEvent$, lights) => {
    onEvent$.onValue(_ => turnLightsOn(lights))
    offEvent$.onValue(_ => turnLightsOff(lights))
}

// light controls
toggleLightsWithEvent(
    tradfriRemote("sensor.remote_tradfri_1_action").toggle$, 
    allLights
        .filter(inRoom("livingroom"))
        .map(entityId)
)

toggleLightsWithEvent(
    tradfriRemote("sensor.remote_tradfri_5_action").toggle$,
    allLights
        .filter(inRoom("livingroom"))
        .map(entityId)
)

toggleLightsWithEvent(
    tradfriRemote("sensor.remote_tradfri_2_action").toggle$,
    allLights
        .filter(inRoom("bedroom"))
        .map(entityId)
)

toggleLightsWithEvent(
    tradfriRemote("sensor.remote_tradfri_3_action").toggle$,
    allLights
        .filter(inRoom("kitchen"))
        .map(entityId)
)

toggleLightsWithEvent(
    tradfriRemote("sensor.remote_tradfri_4_action").toggle$,
    allLights
        .filter(inRoom("office"))
        .map(entityId)
)
