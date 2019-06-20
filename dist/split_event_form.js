'use strict';

System.register(['app/core/core', './utils', './table_ctrl'], function (_export, _context) {
  "use strict";

  var appEvents, utils, refreshPanel, currentRecord, nextRecord, min, max, reasonsStr, categoryStr, equipmentStr, isTimeEditing, isSplittingLeft, retryTimes;

  /**
   * Show the split form with @param [array] options , which is an arr with category and reasons chosen in the editor form
   * and the @param {obj} current , current record/row that was clicked in the form
   * and the @param {obj} next , next record of the record/row that was clicked in the form
   */
  function showSplitForm(options, current, next) {
    dataInit(options, current, next);

    appEvents.emit('show-modal', {
      src: 'public/plugins/smart-factory-event-editor-table-panel/partials/split_event_form.html',
      modalClass: 'confirm-modal event-split-form-modal',
      model: {}
    });

    retryTimes = 1;
    startCtr();
  }

  function startCtr() {
    setTimeout(function () {
      try {
        startCtrl();
      } catch (e) {
        if (retryTimes > 15) {
          console.log(e);
          $('#event-split-form-cancelBtn').trigger('click');
          utils.alert('error', 'Error', 'Split Form init failed due to the form trying to initialise and at the same time the page being refreshing, please try agian');
        } else {
          // console.log('Split Form init failed due to the page being refreshing, re-initialising...the ' + retryTimes + 'th time');
          startCtr();
          console.log(e);
          retryTimes++;
        }
      }
    }, 200);
  }

  /**
   * Initialise the time range slider
   * Remove all listeners then adding them back
   * Some other input initialisations
   */
  function startCtrl() {
    // console.log(new Date(currentRecord.time).getTime());
    // console.log(new Date().getTime());
    // console.log(new Date(nextRecord.time).getTime());


    min = new Date(currentRecord.time).getTime();
    max = $.isEmptyObject(nextRecord) ? new Date().getTime() : new Date(nextRecord.time).getTime();
    var value = min + (max - min) / 2;

    $('#event-split-input').val(getDateTime(value));
    $('#event-split-target-time').text(getDateTime(min));
    $('#event-split-next-time').text(getDateTime(max));
    $('#event-split-category-left').text(categoryStr + ', ' + reasonsStr + equipmentStr);
    $('#event-split-category-right').text(categoryStr + ', ' + reasonsStr + equipmentStr);

    var slider = $('#event-editor-table-split-slider').slider({
      min: min,
      max: max,
      value: value,
      step: 1,
      tooltip: 'hide',
      formatter: function formatter(val) {
        return getDateTime(val);
      }
    });

    $('#ex1Slider .slider-selection').css('background', '#4cd964');

    slider.on('change', function (obj) {
      var newVal = obj.value.newValue;
      $('#event-split-input').val(getDateTime(newVal));
    });

    removeListeners();
    addListeners();
  }

  /**
   * Pass the timestamp in and return the date and time in the following format
   * YYYY-MM-DD HH:MM:SS.SSS
   * @param {*} timestamp
   */
  function getDateTime(timestamp) {
    var monthDate = ('0' + new Date(timestamp).getDate()).slice(-2);
    var month = ('0' + (new Date(timestamp).getMonth() + 1)).slice(-2);
    var year = new Date(timestamp).getFullYear();
    var date = year + '-' + month + '-' + monthDate;

    var hrs = ('0' + new Date(timestamp).getHours()).slice(-2);
    var mins = ('0' + new Date(timestamp).getMinutes()).slice(-2);
    var seconds = ('0' + new Date(timestamp).getSeconds()).slice(-2);
    var milSec = new Date(timestamp).getMilliseconds();
    var time = hrs + ':' + mins + ':' + seconds + '.' + milSec;

    var dateTime = date + ' ' + time;
    return dateTime;
  }

  /**
   * Add listeners
   */
  function addListeners() {
    var time = void 0;

    $(document).on('click', '#event-split-input-saveBtn', function (e) {
      if (!isTimeEditing) {
        // start editing
        time = $('#event-split-input').val();
        enableTimeEdition(e);
      } else {
        // save changes
        checkValidationThenApply($('#event-split-input').val(), time);
        disableTimeEdition();
      }
    });

    $(document).on('click', '#event-split-input-cancelSpan', function () {
      disableTimeEdition();
      if (time) {
        $('#event-split-input').val(time);
      }
    });

    // Handler for user to split left and right
    $(document).on('click', 'input[type=radio][name=split-options]', function (e) {
      if (e.target.id === 'left') {
        $('#ex1Slider .slider-selection').css('background', '#4cd964');
        $('#ex1Slider .slider-track-high').css('background', '');
        $('#event-split-category-left').show();
        $('#event-split-category-right').hide();
        isSplittingLeft = true;
      } else if (e.target.id === 'right') {
        $('#ex1Slider .slider-selection').css('background', '');
        $('#ex1Slider .slider-track-high').css('background', '#eb972a');
        $('#event-split-category-left').hide();
        $('#event-split-category-right').show();
        isSplittingLeft = false;
      }
    });

    splitFormSubmitListener();
  }

  /**
   * Remove listeners
   */
  function removeListeners() {
    $(document).off('click', '#event-split-input-cancelSpan');
    $(document).off('click', '#event-split-input-saveBtn');
    $(document).off('click', 'input[type=radio][name=split-options]');
    $(document).off('click', '#event-split-form-submitBtn');
  }

  /**
   * Submit listener for the split form.
   * Update the current record and create a new record based on different conditions via xmlhttprequests
   * Then close the form at the end if successful
   */
  function splitFormSubmitListener() {
    $(document).on('click', '#event-split-form-submitBtn', function (e) {
      var newTimestamp = $('#event-editor-table-split-slider').slider('getValue') * 1000000;
      var oldTimestamp = min * 1000000;
      var maxTimestamp = max * 1000000;
      var lineForLeft = void 0;
      var lineForRight = void 0;

      if (isSplittingLeft) {
        lineForLeft = writeInfluxLine(currentRecord, categoryStr, reasonsStr, equipmentStr, oldTimestamp, newTimestamp, maxTimestamp, isSplittingLeft, true);
        lineForRight = writeInfluxLine(currentRecord, null, null, null, oldTimestamp, newTimestamp, maxTimestamp, isSplittingLeft, false);
      } else {
        // splitting right
        lineForLeft = writeInfluxLine(currentRecord, null, null, null, oldTimestamp, newTimestamp, maxTimestamp, isSplittingLeft, true);
        lineForRight = writeInfluxLine(currentRecord, categoryStr, reasonsStr, equipmentStr, oldTimestamp, newTimestamp, maxTimestamp, isSplittingLeft, false);
      }

      var url = utils.influxHost + 'write?db=smart_factory';
      utils.post(url, lineForLeft).then(utils.post(url, lineForRight).then(function (res) {
        // console.log(res)
        $('#event-split-form-cancelBtn').trigger('click');
        utils.alert('success', 'Success', 'Event successfully splitted');
        refreshPanel();
      }).catch(function (e) {
        console.log(e);
        $('#event-split-form-cancelBtn').trigger('click');
        utils.alert('error', 'Error', 'An error occurred while updating data to the database, please try again');
      })).catch(function (e) {
        console.log(e);
        $('#event-split-form-cancelBtn').trigger('click');
        utils.alert('error', 'Error', 'An error occurred while updating data to the database, please try again');
      });
    });
  }

  /**
   * Validate the input when the user try to save the edited time range in the top box.
   * The 'value' passed in is the input that the user entered, -
   * and the 'time' passed in is the current value of the slider.
   * If 'value' not valid, set the slider back to 'time'
   * If 'value' valid, set the slider to 'value'
   * @param {string} value
   * @param {string} time
   */
  function checkValidationThenApply(value, time) {
    var dateTime = new Date(value).getTime();
    if (isNaN(dateTime)) {
      // error - The date time entered is not in a correct format, please follow the original format
      $('#event-split-input').val(time);
      utils.alert('warning', 'Warning', 'The date time entered is not in a correct format, please follow the original format');
    } else {
      // at lease provide precision of s
      if (value.length < 19) {
        // error - Please at least provide precision of seconds
        $('#event-split-input').val(time);
        utils.alert('warning', 'Warning', 'Please at least provide precision of seconds');
      } else if (value.length > 23) {
        // error - Precision can only be up to milliseconds
        $('#event-split-input').val(time);
        utils.alert('warning', 'Warning', 'Precision can only be up to milliseconds');
      } else {
        // result timestamp must be in range
        if (dateTime < min || dateTime > max) {
          // error - date time entered is out of range
          $('#event-split-input').val(time);
          utils.alert('warning', 'Warning', 'The date time entered is out of range');
        } else {
          // OK
          $('#event-editor-table-split-slider').slider('setValue', parseInt(dateTime));
        }
      }
    }
  }

  /**
   * Enable the input edition
   * By removing the input readonly, changing 'edit' button text back to 'save' and showing the 'cancel' button
   */
  function enableTimeEdition(e) {
    var input = $('#event-split-input');
    input.removeAttr('readonly');
    input.focus();
    e.target.innerHTML = 'Save';
    $('#event-split-input-cancelSpan').show();
    isTimeEditing = true;
  }

  /**
   * Disable the input edition
   * By setting the input readonly, changing 'save' button text back to 'edit' and hiding the 'cancel' button
   */
  function disableTimeEdition() {
    $('#event-split-input').prop('readonly', true);
    $('#event-split-input-saveBtn').text('Edit');
    $('#event-split-input-cancelSpan').hide();
    isTimeEditing = false;
  }

  /**
   * Initialisation of data, handling data and then set them global
   * @param {*} options
   * @param {*} current
   * @param {*} next
   */
  function dataInit(options, current, next) {
    currentRecord = current;
    nextRecord = next;
    // console.log(options);
    var category = options.filter(function (opt) {
      return opt.name === 'category';
    });

    var reasons = options.filter(function (opt) {
      return opt.name.includes('reasons-');
    });
    reasons = reasons.reduce(function (arr, r) {
      arr.push(r.value);
      return arr;
    }, []);

    var equipment = options.filter(function (opt) {
      return opt.name === 'equipment';
    });

    categoryStr = category.length > 0 ? category[0].value : 'NO Category';
    reasonsStr = reasons.length > 0 ? reasons.join(' | ') : 'NO Reasons';
    equipmentStr = equipment[0].value === "" ? '' : ', from ' + equipment[0].value;

    isTimeEditing = false;
    isSplittingLeft = true;
  }

  /**
   * Convert the data into a influxdb writing format based on different conditions
   * Return 'line' in string
   * @param {*} cur
   * @param {*} category
   * @param {*} reason
   * @param {*} timestamp
   * @param {*} isLeft
   * @param {*} forLeft
   */
  function writeInfluxLine(cur, category, reason, equipment, minTime, selectedTime, maxTime, isLeft, forLeft) {
    var line = 'Availability,Site=' + cur.Site + ',Area=' + cur.Area + ',Line=' + cur.Line + ' ';
    line += 'stopped=' + cur.stopped + ',';
    line += 'idle=' + cur.idle + ',';
    line += 'execute=' + cur.execute + ',';
    line += 'held=' + cur.held + ',';
    line += 'complete=' + cur.complete;
    line += ',' + 'status="' + cur.status + '"';

    if (forLeft) {
      if (cur.comment !== null && cur.comment !== undefined && cur.comment !== '') {
        line += ',' + 'comment="' + cur.comment + '"';
      }
      //update duration after splitting
      var diff = selectedTime - minTime;
      var dur = getDuration(diff);
      line += ',' + 'durationInt=' + diff / 1000000;
      line += ',' + 'duration="' + dur + '"';
    } else {
      //update duration after splitting
      var _diff = maxTime - selectedTime;
      var _dur = getDuration(_diff);
      line += ',' + 'durationInt=' + _diff / 1000000;
      line += ',' + 'duration="' + _dur + '"';
    }

    if (category !== 'NO Category' && category !== null) {
      line += ',' + 'category="' + category + '"';
    } else {
      // cate empty, insert the old one
      if (forLeft) {
        if (cur.category !== null && cur.category !== undefined) {
          line += ',' + 'category="' + cur.category + '"';
        }
      }
    }

    if (equipment !== "" && equipment !== null) {
      line += ',' + 'equipment="' + equipment.substring(7, equipment.length) + '"';
    } else {
      // cate empty, insert the old one
      if (forLeft) {
        if (cur.equipment !== null && cur.equipment !== undefined) {
          line += ',' + 'equipment="' + cur.equipment + '"';
        }
      }
    }

    if (reason !== 'NO Reasons' && reason !== null) {
      line += ',' + 'parentReason="' + reason.split(' | ')[0] + '"';
      line += ',' + 'reason="' + reason + '"';
    } else {
      // reason empty, insert the old one
      if (forLeft) {
        // write only for left record
        if (category === 'NO Category') {
          // insert old record only when category is empty, meaning that the user hasn't changed anything
          if (cur.reason !== null && cur.reason !== undefined) {
            line += ',' + 'parentReason="' + cur.reason.split(' | ')[0] + '"';
            line += ',' + 'reason="' + cur.reason + '"';
          }
        } else {
          // otherwise, empty the reason filed no matter what
          if (isLeft) {
            line += ',' + 'reason=' + '""';
          } else {
            // is splitting right, the left record should have the old data
            if (cur.reason !== null && cur.reason !== undefined) {
              line += ',' + 'parentReason="' + cur.reason.split(' | ')[0] + '"';
              line += ',' + 'reason="' + cur.reason + '"';
            }
          }
        }
      }
    }

    if (forLeft) {
      line += ' ' + minTime;
    } else {
      line += ' ' + selectedTime;
    }

    return line;
  }

  /**
   * Get two timestamps and return the difference in a fixed format
   * @param {*} prev 
   * @param {*} now 
   */
  function getDuration(diff) {

    var difference = diff / 1000000;
    var milSecs = parseInt(difference % 1000);

    var daysDiff = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDiff * 1000 * 60 * 60 * 24;

    var hrsDiff = Math.floor(difference / 1000 / 60 / 60);
    difference -= hrsDiff * 1000 * 60 * 60;

    var minsDiff = ('0' + Math.floor(difference / 1000 / 60)).slice(-2);
    difference -= minsDiff * 1000 * 60;

    var secsDiff = ('0' + Math.floor(difference / 1000)).slice(-2);
    difference -= minsDiff * 1000;

    var timeToAdd = daysDiff * 24;
    hrsDiff = hrsDiff + timeToAdd;
    hrsDiff = hrsDiff < 10 ? '0' + hrsDiff : hrsDiff;

    return hrsDiff + ':' + minsDiff + ':' + secsDiff + '.' + milSecs;
  }

  return {
    setters: [function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }, function (_utils) {
      utils = _utils;
    }, function (_table_ctrl) {
      refreshPanel = _table_ctrl.refreshPanel;
    }],
    execute: function () {
      currentRecord = {};
      nextRecord = {};
      min = void 0;
      max = void 0;
      reasonsStr = void 0;
      categoryStr = void 0;
      equipmentStr = void 0;
      isTimeEditing = false;
      isSplittingLeft = true;
      retryTimes = 1;

      _export('showSplitForm', showSplitForm);
    }
  };
});
//# sourceMappingURL=split_event_form.js.map
