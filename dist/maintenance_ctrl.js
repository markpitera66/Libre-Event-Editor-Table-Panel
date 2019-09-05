'use strict';

System.register(['./utils', 'moment', './camundaAPI'], function (_export, _context) {
  "use strict";

  var utils, moment, camunda, _createClass, MaintenanceCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_utils) {
      utils = _utils;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_camundaAPI) {
      camunda = _camundaAPI;
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

      _export('MaintenanceCtrl', MaintenanceCtrl = function () {
        /** @ngInject */
        function MaintenanceCtrl(ctrl) {
          _classCallCheck(this, MaintenanceCtrl);

          this.init(ctrl);
          this.prepare();
        }

        _createClass(MaintenanceCtrl, [{
          key: 'init',
          value: function init(ctrl) {
            this.currentEvent = ctrl.currentEvent.record;
            this.form = {
              requestComment: '',
              category: this.currentEvent.category,
              duration: this.currentEvent.durationFormat,
              line: this.currentEvent.line,
              area: this.currentEvent.area,
              site: this.currentEvent.site,
              meta: {
                isSending: false
              },
              sendBtnMsg: 'Send'
            };
          }
        }, {
          key: 'prepare',
          value: function prepare() {
            this.form.lineCombined = [this.currentEvent.site, this.currentEvent.area, this.currentEvent.line].join(' | ');
            this.form.equipment = this.currentEvent.equipment || 'Unknown';
            this.form.equipment = this.form.equipment.split(' | ')[1] || this.form.equipment.split(' | ')[0];
            this.form.reason = this.currentEvent.reason || 'Unknown';
            if (!this.currentEvent.status) {
              this.form.status = this.currentEvent.machinestate || 'Unknown';
            } else {
              this.form.status = this.currentEvent.status;
            }
            this.form.time = moment(this.currentEvent.time).format('YYYY-MM-DD HH:mm:ss');
            this.form.eventComment = this.currentEvent.comment || '';
          }
        }, {
          key: 'show',
          value: function show() {
            utils.showModal('maintenanceRequestComment.html', this);
          }
        }, {
          key: 'onSend',
          value: async function onSend() {

            this.enableSending();

            var result = await camunda.postMsg(this.form);

            if (result.ok) {
              utils.alert('success', 'Successful', 'The event has been successfully splitted');
              this.closeForm();
            } else {
              utils.alert('error', 'Error', 'Unexpected error occurred when sending the maintenance request due to ' + result.error + ', please try again or contact the dev team');
              this.closeForm();
              console.log(result.error);
            }
          }
        }, {
          key: 'process',
          value: function process() {
            return {};
          }
        }, {
          key: 'closeForm',
          value: function closeForm() {
            this.disableSending();
            setTimeout(function () {
              document.querySelector('#edit-maintenance-request-comment-close-btn').click();
            }, 0);
          }
        }, {
          key: 'enableSending',
          value: function enableSending() {
            this.form.meta.isSending = true;
            this.form.sendBtnMsg = 'Sending... ';
          }
        }, {
          key: 'disableSending',
          value: function disableSending() {
            this.form.meta.isSending = false;
            this.form.sendBtnMsg = 'Send';
          }
        }]);

        return MaintenanceCtrl;
      }());

      _export('MaintenanceCtrl', MaintenanceCtrl);
    }
  };
});
//# sourceMappingURL=maintenance_ctrl.js.map
