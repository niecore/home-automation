import * as R from "ramda"
import Kefir from "kefir"

import { haRx, state } from "./connection.mjs"

export const isEntityType = R.curry((entityType, data) => R.pipe(
    R.propOr("", "entity_id"),
    R.startsWith(entityType + ".")
)(data))

const getAttributeOfEntity = state => entity => {
    const entityState = R.find(R.propEq("entity_id", entity.entity_id), state)
    return R.propOr({}, "attributes", entityState)
}

export const hasDeviceClass = deviceClass => entity => {
    const attributeOfEntity = getAttributeOfEntity(state)(entity);
    return R.propEq("device_class", deviceClass, attributeOfEntity)
}

const anyBooleanInArrayTrue = R.reduce(R.or, false)
const allBooleanInArrayTrue = R.reduce(R.and, true)
const binarayStringToBoolean = string => string.toLowerCase() == "on"



export const isThermostat = isEntityType("climate")

const isEntity = R.propEq("entity_id")

export const entity$ = entityId => {
    const currentState = Kefir.fromPromise(haRx.getStates())
        .map(R.find(R.propEq("entity_id", entityId)))
        .toProperty()

    const stateChanges = haRx.events$("state_changed")
        .filter(isEntity(entityId))
        .map(R.prop("new_state"))

    return currentState.merge(stateChanges)
}

export const entities$ = entitdyIds => Kefir.combine(R.map(entity$, entitdyIds))

export const entityState$ = entityId => entity$(entityId)
    .map(R.prop("state"))

export const friendlyName = ev => R.pathOr(ev.entity_id, ["attributes", "friendly_name"], ev)

export const booleanEntityTrue$ = entityId => entityState$(entityId)
    .filter(R.is(String))
    .map(binarayStringToBoolean)

export const anyBooleanEntityTrue$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
    .map(R.map(binarayStringToBoolean))
    .map(anyBooleanInArrayTrue)
    .skipDuplicates()

export const allBooleanEntityTrue$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
    .map(R.map(binarayStringToBoolean))
    .map(allBooleanInArrayTrue)
    .skipDuplicates()

export const meanOfNumericEntities$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
    .map(R.mean)
    .skipDuplicates()

export const minOfNumericEntities$ = entityIds => Kefir.combine(R.map(entityState$, entityIds))
    .map(R.reduce(R.min, Number.MAX_SAFE_INTEGER))
    .skipDuplicates()

export const inputSelectState$ = R.curry((selectState, entityId) => entityState$(entityId)
    .filter(R.equals(selectState))
    .map(R.T))    

export const entityId = R.prop("entity_id")