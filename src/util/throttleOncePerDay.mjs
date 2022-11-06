import * as Kefir from "kefir";

const throttleOncePerDay = src => {
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

export {throttleOncePerDay as default};