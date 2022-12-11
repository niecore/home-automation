import homeassistantRx from "homeassistant-rx";
import homeassistant from "homeassistant"
import * as R from "ramda";
import * as Kefir from "kefir";
import filterByLogged from "./util/filterByLogged.mjs";
import throttleOncePerDay from "./util/throttleOncePerDay.mjs"
import {streamLogger, logger} from "./util/logger.mjs"

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

    // debug
    const displayStateOfEntity = id => console.log(R.filter(R.propEq("entity_id", id), state));
    const displayEntity = id => console.log(R.filter(R.propEq("entity_id", id), entities));

    // util
    const mergeStreams = R.reduce((a, b) => a.merge(b), Kefir.never())
    const combineStreams = Kefir.combine
    const anyBooleanInArrayTrue = R.reduce(R.or, false)
    const allBooleanInArrayTrue = R.reduce(R.and, true)
    const binarayStringToBoolean = string => string.toLowerCase() == "on"

    const objectMap = fnc => R.pipe(
        R.map(x => [x, fnc(x)]),
        R.fromPairs
    )

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

    const minOfNumericEntities$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
        .map(R.reduce(R.min, Number.MAX_SAFE_INTEGER))
        .skipDuplicates()

    const getAttributeOfEntity = state => entity => {
        const entityState = R.find(R.propEq("entity_id", entity.entity_id), state)
        return R.propOr({}, "attributes", entityState)
    }

    // notifications
    const notify = message => haRx.callService("notify", "telegram_message", {}, { message: message })

    // switch
    const switchTurnOn = entityId => haRx.callService("switch", "turn_on", { entity_id: entityId })
    const switchTurnOff = entityId => haRx.callService("switch", "turn_off", { entity_id: entityId })
    
    // input select
    const selectOption = (entityId, option) => haRx.callService("input_select", "select_option", { entity_id: entityId }, { option: option})
    const inputSelectState$ = R.curry((selectState, entityId) => entityState$(entityId)
        .filter(R.equals(selectState))
        .map(R.T))

    // lights
    const anyLightsOn$ = anyBooleanEntityTrue$
    const allLightsOff$ = entityIds => anyLightsOn$(entityIds).map(R.not)

    const turnLightsOn = entityId => haRx.callService("light", "turn_on", { entity_id: entityId })
    const turnLightsOff = entityId => haRx.callService("light", "turn_off", { entity_id: entityId })
    const turnLightsOnWithBrightness = R.curry((entityId, brightness) => haRx.callService("light", "turn_on", { entity_id: entityId }, { brightness_pct: brightness }))
    const turnWakeUpLightOn = entityId => {
        turnLightsOnWithBrightness(entityId, 1)
        haRx.callService("light", "turn_on", { entity_id: entityId }, {transition: 300, brightness_pct: 100 })
    }

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
    const meanIlluminacaeToDark = R.gt(40)
    const luminousityInRoomToLow$ = entityIds => minOfNumericEntities$(entityIds)
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

    const aqaraTwoChannelSwitch = entityId => {
        const deviceStream = entityState$(entityId)
        return {
            single_left$: deviceStream.filter(R.equals("single_left")),
            single_right$: deviceStream.filter(R.equals("single_right"))
        }
    }

    // groups
    const getMemebersOfGroups = groupId => R.pipe(
        R.find(R.propEq("entity_id", groupId)),
        R.pathOr([],["attributes","entity_id"])
    )(state);

    const home = {
        livingroom: {
            lights: getMemebersOfGroups("light.group_livingroom_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_livingroom_occupancy"),
            luminositySensors: getMemebersOfGroups("group.livingroom_luminosity"),
            windowSensors: getMemebersOfGroups("binary_sensor.group_livingroom_openings"),
            thermostat: "climate.livingroom"
        },
        kitchen: {
            lights: getMemebersOfGroups("light.group_kitchen_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_kitchen_occupancy"),
            luminositySensors: getMemebersOfGroups("group.kitchen_luminosity"),
            windowSensors: getMemebersOfGroups("binary_sensor.group_kitchen_openings")
        },
        bedroom: {
            lights: getMemebersOfGroups("light.group_bedroom_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_bedroom_occupancy"),
            luminositySensors: getMemebersOfGroups("group.bedroom_luminosity"),
            thermostat: "climate.bedroom"
        },
        hall: {
            lights: getMemebersOfGroups("light.group_hall_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_hall_occupancy"),
            luminositySensors: getMemebersOfGroups("group.hall_luminosity"),
            windowSensors: getMemebersOfGroups("binary_sensor.group_hall_openings")
        },
        staircase: {
            lights: getMemebersOfGroups("light.group_staircase_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_staircase_occupancy"),
            luminositySensors: getMemebersOfGroups("group.staircase_luminosity"),
        },
        storage: {
            lights: getMemebersOfGroups("light.group_storage_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_storage_occupancy"),
            luminositySensors: getMemebersOfGroups("group.storage_luminosity"),
        },
        garden: {
            lights: getMemebersOfGroups("light.group_garden_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_garden_occupancy"),
            luminositySensors: getMemebersOfGroups("group.garden_luminosity"),
        },
        office: {
            lights: getMemebersOfGroups("light.group_office_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_office_occupancy"),
            luminositySensors: getMemebersOfGroups("group.office_luminosity"),
            windowSensors: getMemebersOfGroups("binary_sensor.group_office_openings"),
            thermostat: "climate.office"
        },
        bathroom: {
            windowSensors: getMemebersOfGroups("binary_sensor.group_bathroom_openings"),
            thermostat: "climate.bathroom"
        },
        toilette: {},
        guestroom: {
            windowSensors: getMemebersOfGroups("binary_sensor.group_guestroom_openings"),
            thermostat: "climate.guestroom"
        },
        door: {},
        laundryroom: {
            lights: getMemebersOfGroups("light.group_laundryroom_lights"),
            motionSensors: getMemebersOfGroups("binary_sensor.group_laundryroom_occupancy"),
            luminositySensors: getMemebersOfGroups("group.laundryroom_luminosity"),
            windowSensors: getMemebersOfGroups("binary_sensor.group_laundryroom_openings"),
            thermostat: "climate.laundryroom"
        }
    }

    const rooms = R.keys(home)

    const roomHasAttribute = attr => room => home[room] && home[room][attr] && home[room][attr].length != 0;
    const roomHasLights = roomHasAttribute("lights")
    const roomHasMotionSensors = roomHasAttribute("motionSensors")
    const roomHasWindowSensors = roomHasAttribute("windowSensors")
    const roomHasThermostats = roomHasAttribute("thermostat")

    const allHomeEntitiesOfType = type => R.pipe(
        R.map(R.propOr([], type)),
        R.values,
        R.flatten
    )(home)

    const allLights = allHomeEntitiesOfType("lights");

    // automation config
    const automationEnabledEntityId = automationId => "input_boolean.automations_" + automationId
    const automationEnabled$ = automationId => booleanEntityTrue$(automationEnabledEntityId(automationId))
    const filterAutomationEnabled = automationId => filterByLogged(automationId + ": enabled ", automationEnabled$(automationId))
    
    const enableAutomation = automationId =>  haRx.callService("input_boolean", "turn_on", {entity_id: automationEnabledEntityId(automationId)})
    const disableAutomation = automationId =>  haRx.callService("input_boolean", "turn_off", {entity_id: automationEnabledEntityId(automationId)})

    // motion light
    const debounceValue = (value, wait) => obs => {
        const other = obs.filter(val => val !== value)

        return obs
            .debounce(wait)
            .filter(R.equals(value))
            .merge(other)
    }

    const motionDetected$ = entityIds => anyBooleanEntityTrue$(entityIds)
        .thru(debounceValue(false, 300*1000))

    const motionGone$ = entityIds => motionDetected$(entityIds).map(R.not)

    const motionLight = (id, motionSensors, luminositySensors, allLights, reactiveLights, nightReactiveLights) => {
        const disableMotionLights$ = motionGone$(motionSensors)
            .onValue(streamLogger(`${id} motion gone`))

        motionDetected$(motionSensors)
            .onValue(streamLogger(`${id} motion detected`))

        luminousityInRoomToLow$(luminositySensors)
            .onValue(streamLogger(`${id} luminosity to low`))

        const enableMotionLight$ = motionDetected$(motionSensors)
            .combine(luminousityInRoomToLow$(luminositySensors), R.and)
            .skipDuplicates()
            .filter(R.equals(true))
            .thru(filterByLogged(`${id} all lights off`, allLightsOff$(allLights)))
            .thru(filterAutomationEnabled(id))
            .onValue(streamLogger(`${id} turn lights on`))
            .onValue(_ => turnLightsOn(reactiveLights))
            .onValue(_ => {
                // turn lights off (later)
                disableMotionLights$
                    // do not react on motionGone = false events
                    .filter(R.equals(true))
                    // turn off only once
                    .take(1)
                    .onValue(streamLogger(`${id} turn lights off`))
                    .onValue(_ =>  turnLightsOff(allLights))
            })
    }
    
    rooms
        .filter(roomHasLights)
        .filter(roomHasMotionSensors)
        .forEach(room => {
            motionLight(
                "motionlight_" + room,
                home[room].motionSensors,
                home[room].luminositySensors,
                home[room].lights,
                home[room].lights,
                home[room].lights
            )
    });    


    // light controls
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_1_action").toggle$, home.livingroom.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_5_action").toggle$, home.livingroom.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_2_action").toggle$, home.bedroom.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_3_action").toggle$, home.kitchen.lights);
    toggleLightsWithEvent(tradfriRemote("sensor.remote_tradfri_4_action").toggle$, home.office.lights);

    const bedroomRemoteRight = tradfriRemoteSmall("sensor.remote_tradfri_small_2_action")
    switchLightsWithEvents(bedroomRemoteRight.on$, bedroomRemoteRight.off$, ["light.lightbulb_tradfriw_9"])
    // const bedroomRemoteLeft = tradfriRemoteSmall("sensor.remote_tradfri_small_1_action")
    // switchLightsWithEvents(bedroomRemoteLeft.on$, bedroomRemoteLeft.off$, ["light.lightbulb_tradfriw_8"])
    

    // mailbox notification
    const mailBoxNotificationId = "mailbox_notification"
    entityState$("binary_sensor.contact_aqara_4_contact")
        .filter(R.equals("on"))
        .thru(throttleOncePerDay)
        .onValue(streamLogger(`${mailBoxNotificationId}: mailbox opened`))
        .thru(filterAutomationEnabled(mailBoxNotificationId))
        .onValue(_ => notify("mailbox has been opened"))


    // open window rain alert
    const roofWindowOpen$ = anyBooleanEntityTrue$(R.concat(home.laundryroom.windowSensors, home.guestroom.windowSensors))
    const weatherForacest$ = entityState$("weather.home_hourly").skipDuplicates()
    const rainForecast$ = weatherForacest$.filter(R.equals("rainy"))
    const windowRainAlertId = "open_window_rain_alert"
    rainForecast$
        .onValue(streamLogger(`${windowRainAlertId} rain predicted`))
        .thru(filterByLogged(`${windowRainAlertId} roof windows open`, roofWindowOpen$))
        .thru(filterAutomationEnabled(windowRainAlertId))
        .onValue(_ => notify("rain predicted and roof windows open"))


    // open window alert
    const displayNameFromEvent = ev => R.pathOr(ev.entity_id, ["attributes", "friendly_name"], ev)
    const allWindowContactSensors = R.filter(R.anyPass([isDoorSensor, isWindowSensor]), entities);
    const openWindowAlertId = "open_window_alert";
    allWindowContactSensors.forEach(sensor => {
        stateOfEntity$(haRx)(sensor.entity_id)
            .debounce(10*60*1000) // 10 minutes
            .filter(R.propEq("state", "on"))
            .thru(filterAutomationEnabled(openWindowAlertId))
            .onValue(ev => notify(`window open for longer than 10 minutes: ${displayNameFromEvent(ev)}`))
    });

    // light power safe
    rooms
        .filter(roomHasLights)
        .filter(roomHasMotionSensors)
        .forEach(room => {
            const lightShutOffTimeout = 90*60*1000; // 90 min
            const automationId = "light_power_safe";
        
            const motionGoneInAreaTooLong$ = motionGone$(home[room].motionSensors)
                .thru(debounceValue(true, lightShutOffTimeout))
                .onValue(streamLogger(`${automationId} ${room}: motion gone too long`))

            home[room].lights.forEach(light => {
                const lightOnTooLong$ = entityState$(light)
                    .map(binarayStringToBoolean)
                    .thru(debounceValue(true, lightShutOffTimeout))
                    .onValue(streamLogger(`${automationId} ${room} ${light}: light on too long`))

                lightOnTooLong$
                    .combine(motionGoneInAreaTooLong$, R.and)
                    .filter(R.equals(true))
                    .thru(filterAutomationEnabled(automationId))
                    .onValue(streamLogger(`${automationId} turning light off ${light}`))
                    .onValue(_ => turnLightsOff([light])) // todo add warning of shutoff via blink
    
        })
    });

    // media automation scenes
    const tvTurnedOff$ = entityState$("select.harmony_hub_activities")
        .map(R.equals("PowerOff"))

    const tvTurnedOn$ = tvTurnedOff$.map(R.not)
    
    const mediaAutomationId = "forbid_lights_when_tv_on";
    tvTurnedOn$
        .thru(filterAutomationEnabled(mediaAutomationId))
        .onValue(_ => turnLightsOff(["light.shellydimmer_db338b"]))

    booleanEntityTrue$("light.shellydimmer_db338b")
        .thru(filterAutomationEnabled(mediaAutomationId))
        // light turned on
        .filter(R.equals(true))
        // check if tv on
        .thru(filterByLogged(`${mediaAutomationId} tv turned on`, tvTurnedOn$))
        // when light is turned on again within 10 seconds, dont proceed
        .throttle(10*1000, {leading: true, trailing: false})
        // turn light off :D
        .onValue(_ => turnLightsOff("light.shellydimmer_db338b"))

    // home state automations
    const setAtHomeState = () => selectOption("input_select.home_state", "home")
    const setAtAwayState = () => selectOption("input_select.home_state", "away")
    const leaveRemote = aqaraTwoChannelSwitch("sensor.remote_aqara_1_action")

    leaveRemote.single_right$
        .debounce(30*1000) 
        .onValue(_ => setAtAwayState())
        
    leaveRemote.single_left$
        .onValue(_ => setAtHomeState())

    const awayState$ = inputSelectState$("away", "input_select.home_state")
    const homeState$ = inputSelectState$("home", "input_select.home_state")

    booleanEntityTrue$("binary_sensor.motionsensor_aqara_7_occupancy")
        .filter(R.equals(true))
        .filterBy(awayState$)
        .onValue(_ => setAtHomeState())

    awayState$
        .onValue(_ => turnLightsOff(allLights))
        .onValue(_ => switchTurnOn("switch.away_mode"))
        
    homeState$        
        .onValue(_ => switchTurnOff("switch.away_mode"))
        
    // sleep state automations
    tradfriRemoteSmall("sensor.remote_tradfri_small_1_action").on$
        .onValue(_ => selectOption("input_select.sleep_state", "awake"))

    tradfriRemoteSmall("sensor.remote_tradfri_small_1_action").off$
        .onValue(_ => selectOption("input_select.sleep_state", "sleeping"))

    inputSelectState$("waking_up", "input_select.sleep_state")
        .onValue(_ => turnWakeUpLightOn(["light.lightbulb_tradfriw_8", "light.lightbulb_tradfriw_9"]))

    inputSelectState$("sleeping", "input_select.sleep_state")
        .onValue(_ => disableAutomation("motionlight_staircase"))
        .onValue(_ => disableAutomation("motionlight_bedroom"))
        .onValue(_ => turnLightsOff(allLights.filter(light => !R.includes(light, home.bedroom.lights))))

    inputSelectState$("awake", "input_select.sleep_state")
        .onValue(_ => enableAutomation("motionlight_staircase"))
        .onValue(_ => enableAutomation("motionlight_bedroom"))
}

main()