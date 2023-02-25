import * as R from 'ramda'

import { getMemebersOfGroups } from '../homeassistant/groups.mjs'
import { entityId } from '../homeassistant/entities.mjs'

// rooms
const getEntityRoomGroupName = R.concat('group.');

export const rooms = [
    "livingroom",
    "kitchen",
    "bedroom",
    "hall",
    "staircase",
    "storage",
    "garden",
    "office",
    "bathroom",
    "toilette",
    "guestroom",
    "door",
    "laundryroom",
]

export const getEntitiesOfRoom = R.pipe(getEntityRoomGroupName, getMemebersOfGroups)
export const inRoom = R.curry((room, entity) => R.includes(entityId(entity), getEntitiesOfRoom(room).map(entityId)))
export const notInRoom = R.complement(inRoom)