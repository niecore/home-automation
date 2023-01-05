import * as Kefir from "kefir";

const mean = age => src => {
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

export {mean};