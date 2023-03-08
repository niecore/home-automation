import * as R from "ramda";
import moment from "moment";
import { entity$ } from "../homeassistant/entities.mjs";

const afterDate = date => R.filter(R.propSatisfies(R.lt(date), "startsAt"));
const beforeDate = date => R.filter(R.propSatisfies(R.gt(date), "startsAt"));
const findMinimum = R.reduce(R.minBy(R.prop("total")), {total: Infinity});
const inNHours = n => moment().add(n, "hours").toISOString();

const electricityPrices$ = entity$("sensor.electricity_price")

export const currentElectricityPrice$ = electricityPrices$
    .map(R.path(["attributes", "current", "total"]))

export const futureElectricityPrices$ = electricityPrices$
    .map(R.path(["attributes", "all_prices"]))
    .map(afterDate(moment().toISOString()))

export const bestElectricityHoueFuture$ = forecastHouse => futureElectricityPrices$
    .map(beforeDate(inNHours(forecastHouse)))
    .map(findMinimum)
    .map(R.prop("startsAt"))