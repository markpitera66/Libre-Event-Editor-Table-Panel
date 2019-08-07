import {DataList} from './datalist'
/**
 * Expect the product list and production line list data
 * Passed these two data passed in to form the datalist
 * Create datalist object to control the instant search input
 * @param {*} products 
 * @param {*} equipment 
 */
function enableInstantSearch (equipmentData, divkey, inputkey, ulkey) {

  const equipmentDataList = new DataList(
    divkey,
    inputkey,
    ulkey,
    equipmentData
  );

  equipmentDataList.create();
  equipmentDataList.removeListeners()
  equipmentDataList.addListeners(equipmentDataList);
}

export { enableInstantSearch }