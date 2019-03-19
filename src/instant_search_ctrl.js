import {DataList} from './datalist'
/**
 * Expect the product list and production line list data
 * Passed these two data passed in to form the datalist
 * Create datalist object to control the instant search input
 * @param {*} products 
 * @param {*} equipment 
 */
function enableInstantSearch (equipment) {
  
//   equipment = equipment.filter(data => data.production_line !== null && data.equipment === null)

  const equipmentData = equipment.reduce((arr, equip) => {
    const obj = {value: equip, text: equip.production_line + ' | ' + equip.equipment}
    arr.push(obj)
    return arr
  }, [])
  
  const equipmentDataList = new DataList(
    "eet-datalist-equipment",
    "eet-datalist-input-equipment",
    "eet-datalist-ul-equipment",
    equipmentData
  );

  equipmentDataList.create();
  equipmentDataList.removeListeners()
  equipmentDataList.addListeners(equipmentDataList);
}

export { enableInstantSearch }