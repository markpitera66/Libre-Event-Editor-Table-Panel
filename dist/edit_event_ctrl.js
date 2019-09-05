'use strict';

System.register(['./utils', './instant_search_ctrl', './influxAPI', './split_event_form'], function (_export, _context) {
	"use strict";

	var utils, instant, influx, SplitEventCtrl, _createClass, EditEventCtrl;

	function _classCallCheck(instance, Constructor) {
		if (!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	return {
		setters: [function (_utils) {
			utils = _utils;
		}, function (_instant_search_ctrl) {
			instant = _instant_search_ctrl;
		}, function (_influxAPI) {
			influx = _influxAPI;
		}, function (_split_event_form) {
			SplitEventCtrl = _split_event_form.SplitEventCtrl;
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

			_export('EditEventCtrl', EditEventCtrl = function () {
				/** @ngInject */
				function EditEventCtrl(ctrl) {
					_classCallCheck(this, EditEventCtrl);

					this.init(ctrl);
					this.prepare();
				}

				_createClass(EditEventCtrl, [{
					key: 'show',
					value: function show() {
						utils.showModal('event_editor_form.html', this, 'confirm-modal event-editor-form-modal scroll');
					}
				}, {
					key: 'init',
					value: function init(ctrl) {
						this.panelCtrl = ctrl.panelCtrl;
						this.currentEvent = ctrl.currentEvent;
						this.equipment = ctrl.equipment;
						this.reasonCodes = ctrl.reasonCodes;
						this.reasonCodes.currentReasons = [];
						this.editForm = {
							category: this.currentEvent.record.category,
							reasons: [],
							equipment: null,
							comment: this.currentEvent.record.comment,
							saveBtnMsg: 'Save',
							meta: {
								isSaving: false
							}
						};

						// if record's equipment can be found in the posrgres equipment list
						if (this.equipment.datalist.map(function (x) {
							return x.text;
						}).indexOf(this.currentEvent.record.equipment) !== -1) {
							this.editForm.equipment = this.currentEvent.record.equipment;
						}
					}
				}, {
					key: 'prepare',
					value: function prepare() {
						var record = this.currentEvent.record;
						// if there is category but not reason
						if (utils.isValidVal(record.category)) {
							this.reasonCodes.currentReasons.push(this.findReasonsByCategory(record.category));
							// if there is reasons
							if (utils.isValidVal(record.reason)) {
								this.editForm.reasons = record.reason.split(' | ');
								var reasons = this.editForm.reasons;
								for (var i = 0; i < reasons.length; i++) {
									var reason = reasons[i];
									var children = this.findChildrenByReason(reason);
									if (children.length !== 0) {
										this.reasonCodes.currentReasons.push(children);
									}
								}
							}
						}
					}
				}, {
					key: 'dataSearch',
					value: function dataSearch() {
						instant.enableInstantSearch(this.equipment.datalist, 'eet-datalist-equipment', 'eet-datalist-input-equipment', 'eet-datalist-ul-equipment');
					}
				}, {
					key: 'onDataSearchChange',
					value: function onDataSearchChange(event) {
						this.editForm.equipment = event.target.innerHTML;
					}
				}, {
					key: 'onReasonSelect',
					value: function onReasonSelect(key, index) {
						var length = this.reasonCodes.currentReasons.length;
						var newChildren = this.findChildrenByReason(key);
						this.reasonCodes.currentReasons.splice(index + 1, length - (index + 1), newChildren);
						if (newChildren.length === 0) this.reasonCodes.currentReasons.pop();
						this.editForm.reasons.length = index + 1;
					}
				}, {
					key: 'onCategorySelect',
					value: function onCategorySelect(key) {
						this.reasonCodes.currentReasons = [];
						this.editForm.reasons = [];
						this.reasonCodes.currentReasons.push(this.findReasonsByCategory(key));
					}
				}, {
					key: 'onSave',
					value: async function onSave() {
						if (!this.panelCtrl.panel.measurementOK) {
							utils.alert('warning', 'Warning', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query");
							return;
						}

						if (!this.editForm.category) {
							utils.alert('warning', 'Warning', 'Please select a category');
							return;
						}

						if (utils.isValidVal(this.editForm.equipment)) {
							if (this.equipment.datalist.map(function (x) {
								return x.text;
							}).indexOf(this.editForm.equipment) === -1) {
								utils.alert('warning', 'Warning', 'Cannot find equipment "' + this.editForm.equipment + '" in the database, please choose it from the list or just leave it empty');
								return;
							}
						}

						this.enableSaving();

						var measurement = this.panelCtrl.panel.endPoint;
						var result = await influx.insert(measurement, this.currentEvent, this.editForm);

						if (result.ok) {
							utils.alert('success', 'Successful', 'The event has been successfully updated');
							this.closeForm();
							this.panelCtrl.refresh();
						} else {
							utils.alert('error', 'Error', 'Unexpected error occurred when updating this event due to ' + result.error + ', please try again or contact the dev team');
							this.closeForm();
							console.log(result.error);
						}
					}
				}, {
					key: 'onSplit',
					value: function onSplit() {
						//check equipment
						if (utils.isValidVal(this.editForm.equipment)) {
							if (this.equipment.datalist.map(function (x) {
								return x.text;
							}).indexOf(this.editForm.equipment) === -1) {
								utils.alert('warning', 'Warning', 'Cannot find equipment "' + this.editForm.equipment + '" in the database, please choose it from the list or just leave it empty');
								return;
							}
						}

						var splitForm = new SplitEventCtrl(this);
						splitForm.show();
					}
				}, {
					key: 'findReasonsByCategory',
					value: function findReasonsByCategory(key) {
						return this.reasonCodes.reasons.filter(function (x) {
							return x.category === key;
						}).map(function (x) {
							return x.reason;
						});
					}
				}, {
					key: 'findChildrenByReason',
					value: function findChildrenByReason(key) {
						var category = this.editForm.category;
						return this.reasonCodes.parentChildren.filter(function (x) {
							return x.category === category && x.parent === key;
						}).map(function (x) {
							return x.child;
						});
					}
				}, {
					key: 'enableSaving',
					value: function enableSaving() {
						this.editForm.meta.isSaving = true;
						this.editForm.saveBtnMsg = 'Saving... ';
					}
				}, {
					key: 'disableSaving',
					value: function disableSaving() {
						this.editForm.meta.isSaving = false;
						this.editForm.saveBtnMsg = 'Save';
					}
				}, {
					key: 'closeForm',
					value: function closeForm() {
						this.disableSaving();
						setTimeout(function () {
							document.querySelector('#eetp-edit-form-closeBtn').click();
						}, 0);
					}
				}]);

				return EditEventCtrl;
			}());

			_export('EditEventCtrl', EditEventCtrl);
		}
	};
});
//# sourceMappingURL=edit_event_ctrl.js.map
