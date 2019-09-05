'use strict';

System.register(['./utils', './edit_event_ctrl', './maintenance_ctrl'], function (_export, _context) {
	"use strict";

	var utils, EditEventCtrl, MaintenanceCtrl, _createClass, FormOptionCtrl;

	function _classCallCheck(instance, Constructor) {
		if (!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	return {
		setters: [function (_utils) {
			utils = _utils;
		}, function (_edit_event_ctrl) {
			EditEventCtrl = _edit_event_ctrl.EditEventCtrl;
		}, function (_maintenance_ctrl) {
			MaintenanceCtrl = _maintenance_ctrl.MaintenanceCtrl;
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

			_export('FormOptionCtrl', FormOptionCtrl = function () {
				/** @ngInject */
				function FormOptionCtrl(ctrl, timestamp) {
					_classCallCheck(this, FormOptionCtrl);

					this.panelCtrl = ctrl;
					this.currentEvent = { timestamp: timestamp };
					this.allEvents = ctrl.allData;
					this.equipment = { data: null, datalist: null };
					this.reasonCodes = { data: null, categories: null, reasons: null, parentChildren: null };
				}

				_createClass(FormOptionCtrl, [{
					key: 'show',
					value: async function show() {
						var hasQueryData = await this.hasQueryData();
						if (!hasQueryData) {
							return;
						}
						// utils.showModal('form_option_form.html', this, 'editOrMaintenance-modal')
						new EditEventCtrl(this).show();
					}
				}, {
					key: 'hasQueryData',
					value: async function hasQueryData() {
						var measurement = this.panelCtrl.panel.endPoint;
						var timestamp = this.currentEvent.timestamp;
						var influxUrl = utils.influxHost + ('query?pretty=true&db=smart_factory&q=select * from ' + measurement + ' where time = ' + timestamp);
						var measurementResult = await utils.sure(utils.get(influxUrl));
						if (!this.isResultOK(measurementResult, 'influxdb - ' + measurement)) {
							return false;
						}
						if (!this.isMeasureDataOK(measurementResult, 'influxdb - ' + measurement)) {
							return false;
						}
						this.parseData(measurementResult); // make results more structured, and store into cur and next

						try {
							this.currentEvent.record = this.findCurrentEvent(this.currentEvent);
						} catch (e) {
							console.log('e', e);
							return false;
						}

						var equipmentEndPoint = this.panelCtrl.panel.equipmentEndPoint;
						var equipmentUrl = utils.postgRestHost + (equipmentEndPoint + '?production_line=eq.' + this.currentEvent.record.line + '&equipment=not.is.null');
						var equipmentResult = await utils.sure(utils.get(equipmentUrl));
						if (!this.isResultOK(equipmentResult, 'postgresDB - ' + equipmentEndPoint)) {
							return false;
						}
						this.equipment.data = equipmentResult.data;
						this.equipment.datalist = this.equipment.data.reduce(function (arr, equip) {
							var obj = { value: equip, text: equip.production_line + ' | ' + equip.equipment };
							arr.push(obj);
							return arr;
						}, []);

						var reasonCodeEndPoint = this.panelCtrl.panel.reasonCodeEndPoint;
						var reasonCodeUrl = utils.postgRestHost + reasonCodeEndPoint;
						var resonCodeResult = await utils.sure(utils.get(reasonCodeUrl));
						if (!this.isResultOK(resonCodeResult, 'postgresDB - ' + reasonCodeEndPoint)) {
							return false;
						}
						this.parseReasonCodes(resonCodeResult.data);

						return true;
					}
				}, {
					key: 'parseReasonCodes',
					value: function parseReasonCodes(data) {
						this.reasonCodes.data = data;
						var allCategories = data.map(function (x) {
							return x.category_id;
						});
						var categories = Array.from(new Set(allCategories));
						this.reasonCodes.categories = categories;
						this.reasonCodes.reasons = data.filter(function (x) {
							return x.reason_id && !x.parent_reason_id;
						}).map(function (x) {
							return {
								category: x.category_id,
								reason: x.reason_id
							};
						});
						this.reasonCodes.parentChildren = data.filter(function (x) {
							return x.parent_reason_id;
						}).map(function (x) {
							return {
								category: x.category_id,
								parent: x.parent_reason_id,
								child: x.reason_id
							};
						});
					}
				}, {
					key: 'parseData',
					value: function parseData(res) {
						var series = res.data.results[0].series[0];
						var cols = series.columns.map(function (x) {
							return x.toLowerCase();
						});
						var rows = series.values;
						var data = [];
						for (var i = 0; i < rows.length; i++) {
							var row = {};
							for (var k = 0; k < cols.length; k++) {
								row[cols[k]] = rows[i][k];
							}
							data.push(row);
						}

						this.currentEvent.record = data[0];
					}
				}, {
					key: 'findCurrentEvent',
					value: function findCurrentEvent(current) {
						var res = this.allEvents.filter(function (x) {
							return x.time === Math.round(current.timestamp / 1000000);
						});
						return res[0];
					}
				}, {
					key: 'isResultOK',
					value: function isResultOK(result, source) {
						if (!result.ok) {
							utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from ' + source + ', please try again');
							console.log(result.error);
							return false;
						} else {
							return true;
						}
					}
				}, {
					key: 'isMeasureDataOK',
					value: function isMeasureDataOK(result, source) {
						if (!result.data.results[0].series) {
							utils.alert('error', 'Error', source + ' is OK but returns EMPTY result, please make sure the data config measurement matches the one you put in the query and try again');
							return false;
						}
						return true;
					}
				}, {
					key: 'onEditClick',
					value: function onEditClick() {
						new EditEventCtrl(this).show();
					}
				}, {
					key: 'onMaintainClick',
					value: function onMaintainClick() {
						if (utils.isValidVal(this.currentEvent.record.category)) {
							new MaintenanceCtrl(this).show();
						} else {
							utils.alert('error', 'Warning', 'Requesting maintenance requires the Event Category to be specified');
							new EditEventCtrl(this).show();
						}
					}
				}]);

				return FormOptionCtrl;
			}());

			_export('FormOptionCtrl', FormOptionCtrl);
		}
	};
});
//# sourceMappingURL=form_option_ctrl.js.map
