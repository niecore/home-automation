import * as R from "ramda";
import {streamLogger} from "./logger.mjs"

export const filterByLogged = (logFilter, filter$) => obs$ => {
    filter$.onValue(streamLogger(logFilter))
    return obs$.filterBy(filter$);
}

export const throttleOncePerDay = src => {
    let valueReceived = false;
    let secondsUntilEndOfDay = undefined;

    const getSecondsUntilEndOfDay = ()  => {
        const d = new Date();
        const h = d.getHours();
        const m = d.getMinutes();
        const s = d.getSeconds();
        return (24*60*60) - (h*60*60) - (m*60) - s;
    };

    const throttleEvent = src
        .filter(_ => valueReceived == false)
        .onValue(_ => {
            valueReceived = true;
            secondsUntilEndOfDay = getSecondsUntilEndOfDay();
        });

    throttleEvent
        .flatMap(_ => Kefir.later(secondsUntilEndOfDay * 1000, true))
        .onValue(_ => {
            valueReceived = false;
        });

    return throttleEvent
};

export const numericMeanRolling = age => src => {
    var memory = [];

    return src
        .map(newValue => {
            const now = new Date()

            // safe value
            memory.push({val: newValue, ts: now})

            // remove to old values
            memory = memory.filter(function(item) {
                return (now - item.ts) < age
            })

            // calculated time weighted average
            if(memory.length < 2) {
                return newValue
            }
            
            var area = 0
            for (var i = 1; i < memory.length; i++) {
                area = area + (memory[i - 1].val * (memory[i].ts - memory[i - 1].ts))
            }

            const range = memory[memory.length - 1].ts - memory[0].ts
            return area / range
        })
};

export const debounceValue = (value, wait) => obs => {
    const other = obs.filter(val => val !== value)

    return obs
        .debounce(wait)
        .filter(R.equals(value))
        .merge(other)
}