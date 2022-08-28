import homeassistantRx from "homeassistant-rx";
import homeassistant from "homeassistant"
import * as R from "ramda";
import * as Kefir from "kefir";


async function main() {

    const haRx = homeassistantRx({
        hostname: "192.168.0.101",
        port: 8123,
        accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzYjE3ZTM3MmNiZjQ0ZjE4YjY4NjAzOTU5ZGM4ZWJkNSIsImlhdCI6MTYzOTIzNDIyOCwiZXhwIjoxOTU0NTk0MjI4fQ.mkVAPURGx9FhE0s3s4K6F_mPZ2W0ij8i8O6gBeJMGxA"
    });

    const hass = new homeassistant({
        host: "http://192.168.0.101",
        port: 8123,
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzYjE3ZTM3MmNiZjQ0ZjE4YjY4NjAzOTU5ZGM4ZWJkNSIsImlhdCI6MTYzOTIzNDIyOCwiZXhwIjoxOTU0NTk0MjI4fQ.mkVAPURGx9FhE0s3s4K6F_mPZ2W0ij8i8O6gBeJMGxA',
    });

    await haRx.connect();

    // THIS IS STATIC DATA
    const state = await haRx.getStates()
    const areas = await haRx.getAreaRegistry()
    const devices = await haRx.getDeviceRegistry()
    const entities = await haRx.getEntityRegistry()
    const config = await haRx.getConfig()

    // util
    const mergeStreams = R.reduce((a, b) => a.merge(b), Kefir.never())
    const combineStreams = Kefir.combine
    const anyBooleanInArrayTrue = R.reduce(R.or, false)
    const allBooleanInArrayTrue = R.reduce(R.and, true)
    const binarayStringToBoolean = string => string.toLowerCase() !== "off"

    const objectMap = fnc => R.pipe(
        R.map(x => [x, fnc(x)]),
        R.fromPairs
    )

    // logging
    const log = id => msg => value => console.log(id + ": " + msg + " stream_value: " + value);

    // states
    const allStates$ = haRx => {
        const currentState = Kefir.fromPromise(haRx.getStates())
            .map(R.map(obj => R.objOf(obj.entity_id, obj)))
            .map(R.mergeAll);

        const stateChanges = haRx.events$("state_changed")

        return currentState.combine(stateChanges, (state, update) => {
            state[update.entity_id] = update.new_state
            return state
        })
    }

    const stateOfEntity$ = haRx => entityId => {
        const currentState = Kefir.fromPromise(haRx.getStates())
            .map(R.map(obj => R.objOf(obj.entity_id, obj)))
            .map(R.mergeAll)
            .map(R.prop(entityId))

        const stateChanges = haRx.events$("state_changed")
            .filter(isEntity(entityId))
            .map(R.prop("new_state"))

        return currentState.merge(stateChanges)
    }

    // entity
    const isEntityType = R.curry((entityType, data) => R.pipe(
        R.propOr("", "entity_id"),
        R.startsWith(entityType + ".")
    )(data))

    const hasDeviceClass = deviceClass => entity => {
        const attributeOfEntity = getAttributeOfEntity(state)(entity);
        return R.propEq("device_class", deviceClass, attributeOfEntity)
    }

    const isEntity = entityId => R.propEq("entity_id", entityId)

    const isLight = isEntityType("light")
    const isMotionSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("occupancy")])
    const isLuminositySensor = R.allPass([isEntityType("sensor"), hasDeviceClass("illuminance")])

    const entityState$ = entityId => stateOfEntity$(haRx)(entityId)
        .map(R.prop("state"))

    const booleanEntityTrue$ = entityId => entityState$(entityId)
        .filter(R.is(String))
        .map(binarayStringToBoolean)

    const anyBooleanEntityTrue$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
        .map(R.map(binarayStringToBoolean))
        .map(anyBooleanInArrayTrue)
        .skipDuplicates()

    const allBooleanEntityTrue$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
        .map(R.map(binarayStringToBoolean))
        .map(allBooleanInArrayTrue)
        .skipDuplicates()

    const meanOfNumericEntities$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
        .map(R.mean)
        .skipDuplicates()

    // areas
    const getAttributeOfEntity = state => entity => {
        const entityState = R.find(R.propEq("entity_id", entity.entity_id), state)
        return R.propOr({}, "attributes", entityState)
    }

    const filterByAreaId = areaId => R.filter(R.propEq("area_id", areaId))
    const filterByDeviceID = deviceId => R.filter(R.propEq("device_id", deviceId))

    const entitesOfArea = (devices, entities) => areaId => {
        const entitesOfArea = filterByAreaId(areaId)(entities);
        const devicesOfArea = filterByAreaId(areaId)(devices);
        const entitiesOfDevicesInArea = R.flatten(R.map(device => filterByDeviceID(device.id)(entities), devicesOfArea));

        return R.concat(entitiesOfDevicesInArea, entitesOfArea);
    }

    const getEntitiesOfAreaAndFilter = filter => (devices, entities) => areaId => R.map(R.prop("entity_id"), R.filter(filter, entitesOfArea(devices, entities)(areaId)));
    const getLightsOfArea = getEntitiesOfAreaAndFilter(isLight)
    const getMotionSensorsOfArea = getEntitiesOfAreaAndFilter(isMotionSensor)
    const getLuminositySensorsOfArea = getEntitiesOfAreaAndFilter(isLuminositySensor)

    // notifications
    const notify = message => haRx.callService("notify", "telegram_message", {}, { message: message })

    // lights
    const anyLightsOn$ = anyBooleanEntityTrue$
    const anyLightsOff$ = entityIds => anyLightsOn$(entityIds).map(R.not)

    const turnLightsOn = entityId => haRx.callService("light", "turn_on", { entity_id: entityId })
    const turnLightsOff = entityId => haRx.callService("light", "turn_off", { entity_id: entityId })
    const turnLightsOnWithBrightness = R.curry((entityId, brightness) => haRx.callService("light", "turn_on", { entity_id: entityId }, { brightness_pct: brightness }))

    const toggleLightsWithEvent = (toggleEvent$, lights) => {
        toggleEvent$
            .filterBy(anyLightsOff$(lights))
            .onValue(_ => turnLightsOn(lights))

        toggleEvent$
            .filterBy(anyLightsOn$(lights))
            .onValue(_ => turnLightsOff(lights))
    }

    // illuminance
    const meanIlluminacaeToDark = R.gt(50)
    const luminousityInRoomToLow$ = entityIds => meanOfNumericEntities$(entityIds)
        .map(meanIlluminacaeToDark)


    // nighttime
    const nigthtTimeEnabled$ = booleanEntityTrue$("binary_sensor.night_time");

    // devices
    const tradfriRemote = entityId => {
        const deviceStream = entityState$(entityId)
        return {
            toggle$: deviceStream.filter(R.equals("toggle"))
        }
    }

    // automation config
    const automationEnabledEntityId = automationId => "input_boolean.automations_" + automationId
    const automationEnabled$ = automationId => booleanEntityTrue$(automationEnabledEntityId(automationId))

    // motion light
    const motionDetected$ = entityIds => anyBooleanEntityTrue$(entityIds)
    const motionGone$ = entityIds => anyBooleanEntityTrue$(entityIds)
        // all entities have to be off
        .map(R.not)
        // presence gone event will be sent only after 5 minutes of inactivity
        .debounce(300 * 1000)

    const motionLight = (id, motionSensors, luminousitySensors, allLights, reactiveLights, nightReactiveLights) => {
        const logger = log(id)
        const enableMotionLight$ = motionDetected$(motionSensors)
            // do not react on motionDetected = false events
            .filter(R.identity)
            .onValue(logger("motion detected"))
            // only trigger when luminosity is too low
            .filterBy(luminousityInRoomToLow$(luminousitySensors))
            .onValue(logger("room to dark"))
            // only trigger when given lights are off
            .filterBy(anyLightsOff$(allLights))
            .onValue(logger("all lights off"))
            // only trigger when motion light is enabled for this room
            .filterBy(automationEnabled$(id))
            .onValue(logger("motion light automation enabled"))

        enableMotionLight$
            .filterBy(nigthtTimeEnabled$)
            .onValue(_ => {
                turnLightsOnWithBrightness(nightReactiveLights, 1);
                logger("turn nightlights on", _);
            })

        enableMotionLight$
            .filterBy(nigthtTimeEnabled$.map(R.not))
            .onValue(_ => {
                turnLightsOn(reactiveLights);
                logger("turn lights on", _);
            })

        const disableMotionLight$ = motionGone$(motionSensors)
            // do not react on motionGone = false events
            .filter(R.identity)
            // only trigger when motion light is enabled for this room
            .filterBy(automationEnabled$(id))
            .onValue(_ => {
                turnLightsOff(allLights);
                logger("turn lights off", _)
            });
    }
    
    // home
    const areaIds = R.map(R.prop("area_id"), areas)
    const getAreaDevices = areaId => {
        return {
            lights: getLightsOfArea(devices, entities)(areaId),
            motionSensors: getMotionSensorsOfArea(devices, entities)(areaId),
            luminositySesnors: getLuminositySensorsOfArea(devices, entities)(areaId)
        }
    }
    const home = objectMap(getAreaDevices)(areaIds)

    // toggle Area LIghts
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_1_action").toggle$, home.wohnzimmer.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_2_action").toggle$, home.schlafzimmer.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_3_action").toggle$, home.kuche.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_4_action").toggle$, home.buro.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_5_action").toggle$, home.wohnzimmer.lights);

    const roomsWithMotionLight = [
        'wohnzimmer',
        'kuche',
        'schlafzimmer',
        'flur',
        'treppenhaus',
        'speisekammer',
        'buro',
        'waschezimmer'
    ].forEach(area => {
        motionLight(
            "motionlight_" + area,
            home[area].motionSensors,
            home[area].luminositySesnors,
            home[area].lights,
            home[area].lights,
            home[area].lights
        )
    });
}

main()