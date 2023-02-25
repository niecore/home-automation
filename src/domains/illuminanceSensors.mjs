import * as R from 'ramda'
import { isEntityType, hasDeviceClass, minOfNumericEntities$ } from '../homeassistant/entities.mjs'

const meanIlluminanceToDark = R.gt(20)
export const isLuminositySensor = R.allPass([isEntityType("sensor"), hasDeviceClass("illuminance")])
export const luminousityInRoomToLow$ = entityIds => minOfNumericEntities$(entityIds)
    .map(meanIlluminanceToDark)