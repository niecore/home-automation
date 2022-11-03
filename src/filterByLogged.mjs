import * as R from "ramda";

const filterByLogged = (logFilter, filter$) => obs$ => {
    filter$.onValue(val => console.log(logFilter + ": " + val))
    return obs$.filterBy(filter$);
}

export {filterByLogged as default};
