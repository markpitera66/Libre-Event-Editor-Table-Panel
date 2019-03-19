'use strict';

System.register(['./datalist'], function (_export, _context) {
  "use strict";

  var DataList;

  /**
   * Expect the product list and production line list data
   * Passed these two data passed in to form the datalist
   * Create datalist object to control the instant search input
   * @param {*} products 
   * @param {*} equipment 
   */
  function enableInstantSearch(equipment) {

    //   equipment = equipment.filter(data => data.production_line !== null && data.equipment === null)

    var equipmentData = equipment.reduce(function (arr, equip) {
      var obj = { value: equip, text: equip.production_line + ' | ' + equip.equipment };
      arr.push(obj);
      return arr;
    }, []);

    var equipmentDataList = new DataList("eet-datalist-equipment", "eet-datalist-input-equipment", "eet-datalist-ul-equipment", equipmentData);

    equipmentDataList.create();
    equipmentDataList.removeListeners();
    equipmentDataList.addListeners(equipmentDataList);
  }

  return {
    setters: [function (_datalist) {
      DataList = _datalist.DataList;
    }],
    execute: function () {
      _export('enableInstantSearch', enableInstantSearch);
    }
  };
});
//# sourceMappingURL=instant_search_ctrl.js.map
