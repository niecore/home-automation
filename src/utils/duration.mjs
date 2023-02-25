import * as R from "ramda";

export const seconds = R.multiply(1000)
export const minutes = R.pipe(seconds, R.multiply(60))
export const hours = R.pipe(minutes, R.multiply(60))
export const days = R.pipe(minutes, R.multiply(24))
