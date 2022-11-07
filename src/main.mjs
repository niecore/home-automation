import homeassistantRx from "homeassistant-rx";
import homeassistant from "homeassistant"
import * as R from "ramda";
import * as Kefir from "kefir";
import filterByLogged from "./util/filterByLogged.mjs";
import throttleOncePerDay from "./util/throttleOncePerDay.mjs"

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
            .toProperty()

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
    const isWindowSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("window")])
    const isDoorSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("door")])
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
    const getWindowSensorsOfArea = getEntitiesOfAreaAndFilter(isWindowSensor)

    // notifications
    const notify = message => haRx.callService("notify", "telegram_message", {}, { message: message })

    // lights
    const anyLightsOn$ = anyBooleanEntityTrue$
    const allLightsOff$ = entityIds => anyLightsOn$(entityIds).map(R.not)

    const turnLightsOn = entityId => haRx.callService("light", "turn_on", { entity_id: entityId })
    const turnLightsOff = entityId => haRx.callService("light", "turn_off", { entity_id: entityId })
    const turnLightsOnWithBrightness = R.curry((entityId, brightness) => haRx.callService("light", "turn_on", { entity_id: entityId }, { brightness_pct: brightness }))

    const toggleLightsWithEvent = (toggleEvent$, lights) => {
        toggleEvent$
            .filterBy(allLightsOff$(lights))
            .onValue(_ => turnLightsOn(lights))

        toggleEvent$
            .filterBy(anyLightsOn$(lights))
            .onValue(_ => turnLightsOff(lights))
    }

    const switchLightsWithEvents = (onEvent$, offEvent$, lights) => {
        onEvent$.onValue(_ => turnLightsOn(lights))
        offEvent$.onValue(_ => turnLightsOff(lights))
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

    const tradfriRemoteSmall = entityId => {
        const deviceStream = entityState$(entityId)
        return {
            on$: deviceStream.filter(R.equals("on")),
            off$: deviceStream.filter(R.equals("off"))
        }
    }

    // home
    const areaIds = R.map(R.prop("area_id"), areas)
    const getAreaDevices = areaId => {
        return {
            lights: getLightsOfArea(devices, entities)(areaId),
            motionSensors: getMotionSensorsOfArea(devices, entities)(areaId),
            luminositySesnors: getLuminositySensorsOfArea(devices, entities)(areaId),
            windowSensors: getWindowSensorsOfArea(devices, entities)(areaId)
        }
    }
    const home = objectMap(getAreaDevices)(areaIds)

    // automation config
    const automationEnabledEntityId = automationId => "input_boolean.automations_" + automationId
    const automationEnabled$ = automationId => booleanEntityTrue$(automationEnabledEntityId(automationId))
    const filterAutomationEnabled = automationId => filterByLogged(automationId + ": enabled ", automationEnabled$(automationId))
    
    // motion light
    const motionDetected$ = entityIds => anyBooleanEntityTrue$(entityIds)
    const motionGone$ = entityIds => motionDetected$(entityIds)
        // all entities have to be off
        .map(R.not)
        // presence gone event will be sent only after 10 minutes of inactivity
        .debounce(600 * 1000)

    const motionLight = (id, motionSensors, luminousitySensors, allLights, reactiveLights, nightReactiveLights) => {
        const logger = log(id)
        const enableMotionLight$ = motionDetected$(motionSensors)
            // do not react on motionDetected = false events
            .filter(R.identity)
            .log(id + ": motion detected")
            // only trigger when luminosity is too low
            .thru(filterByLogged(id + ": luminosity in room to low", luminousityInRoomToLow$(luminousitySensors)))
            .thru(filterByLogged(id + ": all lights off", allLightsOff$(allLights)))
            .thru(filterAutomationEnabled(id))
            .onValue(_ => {
                // turn lights on
                turnLightsOn(reactiveLights);
                logger("turn lights on", _);
            })
            .onValue(_ => {
                // turn lights off (later)
                motionGone$(motionSensors)
                    // do not react on motionGone = false events
                    .filter(R.identity)
                    // only trigger when motion light is enabled for this room
                    .onValue(_ => {
                        turnLightsOff(allLights);
                        logger("turn lights off", _)
                    })
                    // turn off only once
                    .take(1);
            }) 
    }
    
    areaIds.forEach(area => {
        motionLight(
            "motionlight_" + area,
            home[area].motionSensors,
            home[area].luminositySesnors,
            home[area].lights,
            home[area].lights,
            home[area].lights
        )
    });    


    // light controls
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_1_action").toggle$, home.wohnzimmer.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_2_action").toggle$, home.schlafzimmer.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_3_action").toggle$, home.kuche.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_4_action").toggle$, home.buro.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_5_action").toggle$, home.wohnzimmer.lights);

    const bedroomRemoteRight = tradfriRemoteSmall("sensor.remote_tradfri_small_2_action")
    const bedroomRemoteLeft = tradfriRemoteSmall("sensor.remote_tradfri_small_1_action")
    switchLightsWithEvents(bedroomRemoteRight.on$, bedroomRemoteRight.off$, ["light.lightbulb_tradfriw_9"])
    switchLightsWithEvents(bedroomRemoteLeft.on$, bedroomRemoteLeft.off$, ["light.lightbulb_tradfriw_8"])
    

    // mailbox notification
    entityState$("binary_sensor.contact_aqara_4_contact")
        .thru(filterAutomationEnabled("mailbox_notification"))
        .thru(throttleOncePerDay)
        .filter(R.equals("off"))
        .onValue(_ => notify("mailbox has been opened"))


    // open window rain alert
    const roofWindowOpen$ = anyBooleanEntityTrue$(R.concat(home["waschezimmer"].windowSensors, home["schlafzimmer"].windowSensors))
    const weatherForacest$ = entityState$("weather.home_hourly").skipDuplicates()
    const rainForecast$ = weatherForacest$.filter(R.equals("rainy"))
    rainForecast$
        .log("rain forecast: ")
        .thru(filterByLogged("rain forecast: roof windows open", roofWindowOpen$))
        .thru(filterAutomationEnabled("open_window_rain_alert"))
        .onValue(_ => notify("rain predicted and roof windows open"))


    // open window alert
    const displayNameFromEvent = ev => R.pathOr(ev.entity_id, ["attributes", "friendly_name"], ev)
    const allWindowContactSensors = R.filter(R.anyPass([isDoorSensor, isWindowSensor]), entities);
    allWindowContactSensors.forEach(sensor => {
        stateOfEntity$(haRx)(sensor.entity_id)
            .debounce(15*60*1000) // 15 min
            .filter(R.propEq("state", "on"))
            .thru(filterAutomationEnabled("open_window_alert"))
            .onValue(ev => notify("window open for longer than 15 minutes: " + displayNameFromEvent(ev)))
    }); 

    // light power safe
    areaIds.forEach(area => {
        const lightShutOffTimeout = 90*60*1000; // 90 min
        const automationId = "light_power_safe_" + area;

        const motionGoneInArea$ = motionGone$(home[area].motionSensors)
            .debounce(lightShutOffTimeout)
            .log(automationId + ": motion gone for long time")

        home[area].lights.forEach(light => {
            const lightOnToLong$ = entityState$(light)
                .debounce(lightShutOffTimeout)
                .filter(R.equals("on"))
                .log(automationId + ": light on for long time")

            lightOnToLong$
                .combine(motionGoneInArea$, R.and)
                .thru(filterAutomationEnabled(automationId))
                .onValue(_ => turnLightsOff([light]))
        })
    });
}

main()