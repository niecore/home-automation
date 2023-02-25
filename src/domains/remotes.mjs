import * as R from "ramda"

import { entityState$ } from "../homeassistant/entities.mjs"

// todo refactor
export const tradfriRemote = entityId => {
    const deviceStream = entityState$(entityId)
    return {
        toggle$: deviceStream.filter(R.equals("toggle"))
    }
}

export const tradfriRemoteSmall = entityId => {
    const deviceStream = entityState$(entityId)
    return {
        on$: deviceStream.filter(R.equals("on")),
        off$: deviceStream.filter(R.equals("off"))
    }
}

export const aqaraTwoChannelSwitch = entityId => {
    const deviceStream = entityState$(entityId)
    return {
        single_left$: deviceStream.filter(R.equals("single_left")),
        single_right$: deviceStream.filter(R.equals("single_right"))
    }
}