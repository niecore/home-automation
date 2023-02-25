import * as R from "ramda";
import { state } from "../homeassistant/connection.mjs";

const entityNameIsGroup = R.pipe(
    R.anyPass([
        R.startsWith("light.group_"),
        R.startsWith("binary_sensor.group_"),
        R.startsWith("group.")
    ])
)

export const getMemebersOfGroups = groupId => R.pipe(
    R.find(R.propEq("entity_id", groupId)),
    R.pathOr([],["attributes","entity_id"]),
    R.map(entity => {
        // resove nested groups
        if(entityNameIsGroup(entity)){
            return getMemebersOfGroups(entity)
        } else {
            return R.find(R.propEq("entity_id", entity))(state)
        }
    }),
    R.flatten
)(state);