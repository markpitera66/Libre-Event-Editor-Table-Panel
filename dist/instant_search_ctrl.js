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
  function enableInstantSearch(equipmentData, divkey, inputkey, ulkey) {
    var equipmentDataList = new DataList(divkey, inputkey, ulkey, equipmentData);

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
