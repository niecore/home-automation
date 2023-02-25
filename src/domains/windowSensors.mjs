import * as R from 'ramda'
import { home } from './home.mjs'
import { entityId, isEntityType, hasDeviceClass } from '../homeassistant/entities.mjs'

export const isDoorSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("door")])
export const isWindowSensor = R.allPass([isEntityType("binary_sensor"), hasDeviceClass("window")])

export const allWindowContactSensors = home
    .filter(R.anyPass([isDoorSensor, isWindowSensor]))
    .map(entityId)
