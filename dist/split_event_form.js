'use strict';

System.register(['./utils', './influxAPI', './libs/bootstrap-slider'], function (_export, _context) {
  "use strict";

  var utils, influx, slider, _createClass, SplitEventCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_utils) {
      utils = _utils;
    }, function (_influxAPI) {
      influx = _influxAPI;
    }, function (_libsBootstrapSlider) {
      slider = _libsBootstrapSlider.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('SplitEventCtrl', SplitEventCtrl = function () {
        /** @ngInject */
        function SplitEventCtrl(ctrl) {
          _classCallCheck(this, SplitEventCtrl);

          this.init(ctrl);
          this.prepare();
        }

        _createClass(SplitEventCtrl, [{
          key: 'init',
          value: function init(ctrl) {
            this.panelCtrl = ctrl.panelCtrl;
            this.currentEvent = ctrl.currentEvent;
            this.nextEvent = ctrl.nextEvent;
            this.editForm = ctrl.editForm;
            this.splitForm = {
              meta: {
                isSplittingLeft: true,
                isEditing: false,
                isSaving: false,
                tempVal: null
              },
              saveBtnMsg: 'Save'
            };
          }
        }, {
          key: 'prepare',
          value: function prepare() {
            this.splitForm.min = new Date(this.currentEvent.record.time).getTime();
            this.splitForm.max = this.nextEvent.record ? new Date(this.nextEvent.record.time).getTime() : new Date().getTime();
            this.splitForm.value = this.splitForm.min + (this.splitForm.max - this.splitForm.min) / 2;
            this.splitForm.splitInput = this.getDateTime(this.splitForm.value);
            this.splitForm.targetTime = this.getDateTime(this.splitForm.min);
            this.splitForm.nextTime = this.getDateTime(this.splitForm.max);
            this.splitForm.category = utils.isValidVal(this.editForm.category) ? this.editForm.category : 'No Category';
            this.splitForm.reasons = this.editForm.reasons.length !== 0 ? this.editForm.reasons.join(' | ') : 'No Reasons';
            this.splitForm.cateReaText = this.splitForm.category === 'No Category' ? 'No Category' : this.splitForm.category + ' - ' + this.splitForm.reasons;
            this.splitForm.equipment = this.editForm.equipment;
            this.splitForm.comment = this.editForm.comment;
          }
        }, {
          key: 'show',
          value: function show() {
            utils.showModal('split_event_form.html', this, 'confirm-modal event-split-form-modal');
          }
        }, {
          key: 'enableSlider',
          value: function enableSlider() {
            var _this = this;

            var slider = $('#event-editor-table-split-slider').slider({
              min: this.splitForm.min,
              max: this.splitForm.max,
              value: this.splitForm.value,
              step: 1,
              tooltip: 'hide',
              formatter: function formatter(val) {
                return _this.getDateTime(val);
              }
            });

            $('#ex1Slider .slider-selection').css('background', '#4cd964');

            slider.on('change', function (obj) {
              var newVal = obj.value.newValue;
              var result = _this.getDateTime(newVal);
              _this.splitForm.splitInput = result;
              $('#event-split-input').val(result);
            });
          }
        }, {
          key: 'onSplitChange',
          value: function onSplitChange(event) {
            var id = event.target.id;
            if (id === 'left') {
              this.splitLeft();
            } else {
              this.splitRight();
            }
          }
        }, {
          key: 'onTopBoxSave',
          value: function onTopBoxSave() {
            var temp = this.splitForm.meta.tempVal;
            var val = this.splitForm.splitInput;

            var dateTime = new Date(val).getTime();
            if (isNaN(dateTime)) {
              this.splitForm.splitInput = temp;
              utils.alert('warning', 'Warning', 'The date time entered is not in a correct format, please follow the original format');
            } else {
              if (val.length < 19) {
                this.splitForm.splitInput = temp;
                utils.alert('warning', 'Warning', 'Please at least provide precision of seconds');
              } else if (val.length > 23) {
                this.splitForm.splitInput = temp;
                utils.alert('warning', 'Warning', 'Precision can only be up to milliseconds');
              } else {
                if (dateTime < this.splitForm.min || dateTime > this.splitForm.max) {
                  this.splitForm.splitInput = temp;
                  utils.alert('warning', 'Warning', 'The date time entered is out of range');
                } else {
                  //OK
                  this.splitForm.meta.isEditing = false;
                  $('#event-editor-table-split-slider').slider('setValue', parseInt(dateTime));
                }
              }
            }
          }
        }, {
          key: 'onTopBoxCancel',
          value: function onTopBoxCancel() {
            this.splitForm.splitInput = this.splitForm.meta.tempVal;
            this.splitForm.meta.isEditing = false;
          }
        }, {
          key: 'onFormSave',
          value: async function onFormSave() {
            if (!this.panelCtrl.panel.measurementOK) {
              utils.alert('warning', 'Warning', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query");
              return;
            }

            this.enableSaving();

            var newTimestamp = $('#event-editor-table-split-slider').slider('getValue') * 1000000;
            var result = await influx.split(newTimestamp, this.currentEvent, this.splitForm, this.panelCtrl.panel.endPoint);

            if (result.ok) {
              utils.alert('success', 'Successful', 'The event has been successfully splitted');
              this.closeForm();
              this.panelCtrl.refresh();
            } else {
              utils.alert('error', 'Error', 'Unexpected error occurred when splitting this event due to ' + result.error + ', please try agian or contact the dev team');
              this.closeForm();
              console.log(result.error);
            }
          }
        }, {
          key: 'splitLeft',
          value: function splitLeft() {
            this.splitForm.meta.isSplittingLeft = true;
            $('#ex1Slider .slider-selection').css('background', '#4cd964');
            $('#ex1Slider .slider-track-high').css('background', '');
          }
        }, {
          key: 'splitRight',
          value: function splitRight() {
            this.splitForm.meta.isSplittingLeft = false;
            $('#ex1Slider .slider-selection').css('background', '');
            $('#ex1Slider .slider-track-high').css('background', '#eb972a');
          }
        }, {
          key: 'closeForm',
          value: function closeForm() {
            this.disableSaving();
            setTimeout(function () {
              document.querySelector('#eetp-split-form-closeBtn').click();
            }, 0);
          }
        }, {
          key: 'enableSaving',
          value: function enableSaving() {
            this.splitForm.meta.isSaving = true;
            this.splitForm.saveBtnMsg = 'Saving... ';
          }
        }, {
          key: 'disableSaving',
          value: function disableSaving() {
            this.splitForm.meta.isSaving = false;
            this.splitForm.saveBtnMsg = 'Save';
          }
        }, {
          key: 'getDateTime',
          value: function getDateTime(timestamp) {
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
        }]);

        return SplitEventCtrl;
      }());

      _export('SplitEventCtrl', SplitEventCtrl);
    }
  };
});
//# sourceMappingURL=split_event_form.js.map
