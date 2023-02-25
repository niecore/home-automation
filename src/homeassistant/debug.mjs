export const displayStateOfEntity = id => console.log(R.filter(R.propEq("entity_id", id), state));
export const displayEntity = id => console.log(R.filter(R.propEq("entity_id", id), entities));
