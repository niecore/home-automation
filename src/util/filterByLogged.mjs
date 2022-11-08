import * as R from "ramda";
import {streamLogger} from "./logger.mjs"

const filterByLogged = (logFilter, filter$) => obs$ => {
    filter$.onValue(streamLogger(logFilter))
    return obs$.filterBy(filter$);
}

export {filterByLogged as default};
