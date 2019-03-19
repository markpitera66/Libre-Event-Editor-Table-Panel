'use strict';

System.register(['app/core/core', './split_event_form', './utils', './instant_search_ctrl', './libs/bootstrap-slider'], function (_export, _context) {
  "use strict";

  var appEvents, showSplitForm, utils, enableInstantSearch, slider, categoryRes, equipmentRes, rowData, nextData, currentCategorySelected, retryTimes;


  function saveForm(data, timestamp) {

    var equipment = data.filter(function (d) {
      return d.name === 'equipment';
    })[0].value;

    var category = data.filter(function (d) {
      return d.name === 'category';
    });

    var comment = data.filter(function (d) {
      return d.name === 'comment';
    })[0].value;

    if (!category.length > 0) {
      utils.alert('warning', 'Warning', 'Please select a category');
      return;
    }
    var reasons = data.filter(function (d) {
      return d.name.includes('reasons-');
    });
    reasons = reasons.reduce(function (arr, r) {
      arr.push(r.value);
      return arr;
    }, []);
    var reason = reasons.join(' | ');
    var parentReason = reasons[0];

    var line = writeInfluxLine(category[0].value, parentReason, reason, comment, timestamp, equipment);
    console.log(reason);

    var url = utils.influxHost + 'write?db=smart_factory';
    utils.post(url, line).then(function (res) {
      //   console.log(res)
      //save success. close the form
      $('#event-editor-form-cancelBtn').trigger('click');
      utils.alert('success', 'Success', 'database successfully updated');
    }).catch(function (e) {
      console.log(e);
      utils.alert('error', 'Error', 'Unexpected error occurred whiling updating the influx database, please try again');
    });
  }

  /**
   * Write query line to update the selected record influxdb
   */
  function writeInfluxLine(category, parentReason, reason, comment, timestamp, equipment) {
    var line = 'Availability,Site=' + rowData.Site + ',Area=' + rowData.Area + ',Line=' + rowData.Line + ' ';

    line += 'stopped=' + rowData.stopped + ',';
    line += 'idle=' + rowData.idle + ',';
    line += 'execute=' + rowData.execute + ',';
    line += 'held=' + rowData.held + ',';
    line += 'complete=' + rowData.complete + ',';
    line += 'status="' + rowData.status + '"' + ',';

    if (rowData.duration !== null && rowData.duration !== undefined) {
      line += 'duration="' + rowData.duration + '"' + ',';
    }
    if (comment !== '' && comment !== undefined) {
      line += 'comment="' + comment + '"' + ',';
    }
    if (equipment !== '' && equipment !== undefined) {
      line += 'equipment="' + equipment + '"' + ',';
    }
    line += 'parentReason="' + parentReason + '"' + ',';
    line += 'category="' + category + '"' + ',';
    line += 'reason="' + reason + '"' + ' ';
    line += timestamp;

    //   console.log(line);
    return line;
  }

  /**
   * Send query req to influxdb and postgresql in order to show form contents.
   */
  function showForm(timestamp) {
    //console.log(timestamp)
    var influxUrl = utils.influxHost + 'query?pretty=true&db=smart_factory&q=select * from Availability where time >= ' + timestamp + ' limit 2';
    var postgresUrl = utils.postgRestHost + 'reason_codes';

    // send query requests
    utils.get(influxUrl).then(handleData).then(function (url) {
      return utils.get(url).then(function (res) {
        equipmentRes = res;
      }).then(utils.get(postgresUrl).then(function (res) {
        categoryRes = res;
        popUpModal(timestamp);
      })).catch(function (e) {
        utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again');
        console.log(e);
      }).catch(function (e) {
        utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again');
        console.log(e);
      });
    }).catch(function (e) {
      utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again');
      console.log(e);
    });

    // remove all listeners
    removeListeners();
    // add listeners
    addListeners(timestamp);
  }

  /**
   * Popup the event editor form modal and pass the timestamp into the html as for the form_id
   * and then show categories
   */

  _export('showForm', showForm);

  function popUpModal(timestamp) {
    appEvents.emit('show-modal', {
      src: 'public/plugins/event-editor-table-panel/partials/event_editor_form.html',
      modalClass: 'confirm-modal event-editor-form-modal scroll',
      model: { timestamp: timestamp }
    });

    // set timeout to make sure the DOM exist in order to append categories
    retryTimes = 1;
    showCate();
  }

  function showCate() {
    setTimeout(function () {
      try {
        showCategories();
      } catch (e) {
        console.log(e);
        if (retryTimes > 15) {
          $('#event-editor-form-cancelBtn').trigger('click');
          utils.alert('error', 'Error', 'Editor Form init failed due to the form trying to initialise and at the same time the page being refreshing, please try agian');
        } else {
          // console.log('Editor Form init failed due to the page being refreshing, re-initialising...the ' + retryTimes + 'th time');
          showCate();
          retryTimes++;
        }
      }
    }, 200);
  }

  /**
   * As the modal is popped up, meaning that the html DOM is now existing. Show content dynamically based on categoryRes
   * And then add
   */
  function showCategories() {
    // category is the top level, there shouldn't be reason_id and parent_reason_id
    var categories = categoryRes.filter(function (cat) {
      return cat.category_id !== null && cat.reason_id === null && cat.parent_reason_id === null;
    });
    categories = categories.reduce(function (arr, cat) {
      arr.push(cat.category_id);
      return arr;
    }, []);
    var categoriesGroup = $('<div class="radio-tile-group"></div>');
    categories.forEach(function (c) {
      categoriesGroup.append(renderCategory(c));
    });
    var target = $('div.target-being-below-categories');
    categoriesGroup.insertBefore(target);
    //console.log(categories)

    // check if category already exist, if yes, select it
    if (rowData.category !== null) {
      // check if category in categories arr
      if ($.inArray(rowData.category, categories) !== -1) {
        // inArray function returns -1 if false, !== -1 means it exists
        $('input[type=radio][name=category][value=' + '"' + rowData.category + '"' + ']').trigger('click');
      }
    }

    //display comment if there is
    if (rowData.comment !== null && rowData.comment !== undefined && rowData.comment !== '') {
      $('#editor-form-comment-area').text(rowData.comment);
    }

    //just for testing if the form can start successfully, 
    //if not, the slider.on will thorw err, then will catch it to restart the form
    var slider = $('#event-split-slider1').slider({
      min: 1,
      max: 20,
      value: 18
    });
    slider.on('change', function (obj) {});

    if (rowData.equipment !== "" && rowData.equipment !== null && rowData.equipment !== undefined) {
      $('input#eet-datalist-input-equipment').val(rowData.equipment);
    }

    //init the datalist for equipment
    enableInstantSearch(equipmentRes);

    if (categoryRes.length === 0) {
      showEmptyMsg();
    }
  }

  function showEmptyMsg() {
    $('div#category-div-id').text('');
    var group = $('<p>No reason codes were found, you can add reason codes from the <strong>Reason Codes Tree Panel</strong></p>');
    var target = $('div.target-being-below-categories');
    group.insertBefore(target);
  }

  /**
   * Make the response row data from the influxdb into one single object for better use
   * Then use the site, area and line attr from the rowData as the keys to get make up a query url then retrun it
   */
  function handleData(res) {
    var influxRes = res.results[0].series[0];
    var cols = influxRes.columns;
    var vals = influxRes.values;
    var data = [];
    for (var o = 0; o < vals.length; o++) {
      var row = {};
      for (var i = 0; i < cols.length; i++) {
        row[cols[i]] = vals[o][i];
      }
      data.push(row);
    }
    rowData = data[0];
    nextData = data.length === 2 ? data[1] : {};
    // console.log('next record is empty ? --> ' + $.isEmptyObject(nextData))
    var equipmentUrl = utils.postgRestHost + 'equipment?production_line=eq.' + rowData.Line + '&equipment=not.is.null';
    return equipmentUrl;
  }

  /**
   * Make up a single category box with the category passed in, and then return the box.
   */
  function renderCategory(category) {
    var input_container = $('<div class="input-container categories-input-container">');
    var input = $('<input id="' + category + '" class="radio-button" type="radio" name="category" value="' + category + '" />');
    var radio_tile_group = $('<div class="radio-tile"></div>');
    var label = $('<label for="' + category + '" class="radio-tile-label">' + category + '</label>');

    radio_tile_group.append(label);
    input_container.append(input).append(radio_tile_group);

    return input_container;
  }

  /**
   * Show the reasons
   * and then append to the DOM
   * NOTE: if is first, target var passed in is a string. else, target passed in is an object
   */
  function showReasons(target, isFirstLevel) {
    var reasons = void 0;
    var level = void 0;
    var upperReasonsGroup = void 0;

    if (isFirstLevel) {
      // is the first level
      // category = target, reasonid !== null and parentid === null
      reasons = categoryRes.filter(function (cat) {
        return cat.category_id === target && cat.reason_id !== null && cat.parent_reason_id === null;
      });
      level = 1;
    } else {
      // is lower level
      // category = global_currentCategorySelected, reasonsid !== null and parentid === target.value
      reasons = categoryRes.filter(function (cat) {
        return cat.category_id === currentCategorySelected && cat.reason_id !== null && cat.parent_reason_id === target.value;
      });
      // level +1 based on the upper one
      level = parseInt(target.name.split('-')[1]) + 1;
      upperReasonsGroup = target.parentElement.parentElement;
    }

    reasons = reasons.reduce(function (arr, rea) {
      arr.push(rea.reason_id);
      return arr;
    }, []);
    //console.log(reasons)

    if (reasons.length === 0) return;

    var reasonsGroup = $('<div class="switch-field"></div>');

    if (level !== 1) {
      var separator = $('<div class="custom-separator"></div>');
      reasonsGroup.append(separator);
    }

    var title = $('<div class="switch-title">Reason Level ' + level + '</div>');
    reasonsGroup.append(title);

    reasons.forEach(function (r) {
      reasonsGroup.append(renderReason(r, level));
    });

    if (level !== 1) {
      reasonsGroup.insertAfter(upperReasonsGroup);
    } else {
      var appendTarget = $('div.target-being-above-reason-level-1');
      reasonsGroup.insertAfter(appendTarget);
    }

    checkSelectedReasons(level, reasons);
  }

  /**
   * Check if there is reasons that are already selected for each level
   * If there is seleceted reason and for that level, it can be found in the config reason arr, then trigger click
   */
  function checkSelectedReasons(level, config_reasons) {
    // make sure the current selected category is the same with the recorded category to avoid unwanted results
    if (currentCategorySelected === rowData.category) {
      if (rowData.reason !== null) {
        var selectedReasons = rowData.reason.split(' | ');
        if (selectedReasons[level - 1] !== null) {
          if ($.inArray(selectedReasons[level - 1], config_reasons) !== -1) {
            $('input[type=radio][name*=\'reasons-\'][value=' + '"' + selectedReasons[level - 1] + '"' + ']').trigger('click');
          }
        }
      }
    }
  }

  /**
   * Make up a single reason option with the reason passed in, and then return the option.
   */
  function renderReason(reason, level) {
    var id = level + '-' + reason;
    var group = $('<div></div>');
    var input = $('<input type="radio" id="' + id + '" name="reasons-' + level + '" value="' + reason + '"/>');
    var label = $('<label for="' + id + '">' + reason + '</label>');
    group.append(input).append(label);
    return group;
  }

  /**
   * Add listener for categories and reasons
   */
  function addListeners(timestamp) {
    // categories on selected, find reasons where cate_id = this.value && parent_id === null
    $(document).on('change', 'input[type=radio][name=category]', function (e) {
      // console.log(e.target.value)
      currentCategorySelected = e.target.value;
      // must remove all reasons before show reasons
      $('div.switch-field').remove();
      showReasons(e.target.value, true);
    });

    $(document).on('change', "input[type=radio][name*='reasons-']", function (e) {
      // console.log(e.target.value);

      // before show reasons, must remove all reason levels that are below this target reason level
      var reasonGroup = e.target.parentElement.parentElement;
      // Remove reason level one level by one level until it return false.
      while (removeNext(reasonGroup.nextElementSibling)) {}

      showReasons(e.target, false);
    });

    $(document).on('click', 'button#event-editor-form-saveBtn', function () {
      var data = $('form#' + timestamp).serializeArray();
      if (!checkEquipment(data)) {
        return;
      }
      saveForm(data, timestamp);
    });

    $(document).on('click', 'button#event-editor-form-splitBtn', function () {
      var data = $('form#' + timestamp).serializeArray();
      if (!checkEquipment(data)) {
        return;
      }
      $('.event-split-form-modal').remove();
      showSplitForm(data, rowData, nextData);
    });
  }

  function checkEquipment(data) {
    var equipment = data.filter(function (d) {
      return d.name === 'equipment';
    })[0].value;
    //check for equipment input

    if (!isEquipmentValid(equipment)) {
      //equipment can be empty but if it's not empty it must be the same with the original one to ensure consistency
      if (equipment !== "") {
        utils.alert('warning', 'Warning', 'Equipment not found, please select it from the list or leave it empty');
        return false;
      }
    }

    return true;
  }

  function isEquipmentValid(equipment) {

    var equip = equipmentRes.reduce(function (arr, e) {
      var text = e.production_line + ' | ' + e.equipment;
      arr.push(text);
      return arr;
    }, []);
    if (equip.indexOf(equipment) === -1) {
      return false;
    }
    return true;
  }

  function removeListeners() {
    $(document).off('change', 'input[type=radio][name=category]');
    $(document).off('change', "input[type=radio][name*='reasons-']");
    $(document).off('click', 'button#event-editor-form-saveBtn');
    $(document).off('click', 'button#event-editor-form-splitBtn');
  }

  /**
   * Remove Div named 'switch-field', which is one level of reasons
   */
  function removeNext(next) {
    if (next.className === 'switch-field') {
      next.remove();
      return true;
    } else {
      return false;
    }
  }
  return {
    setters: [function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }, function (_split_event_form) {
      showSplitForm = _split_event_form.showSplitForm;
    }, function (_utils) {
      utils = _utils;
    }, function (_instant_search_ctrl) {
      enableInstantSearch = _instant_search_ctrl.enableInstantSearch;
    }, function (_libsBootstrapSlider) {
      slider = _libsBootstrapSlider.default;
    }],
    execute: function () {
      categoryRes = void 0;
      equipmentRes = void 0;
      rowData = {};
      nextData = void 0;
      currentCategorySelected = void 0;
      retryTimes = 1;
    }
  };
});
//# sourceMappingURL=form_ctrl.js.map
