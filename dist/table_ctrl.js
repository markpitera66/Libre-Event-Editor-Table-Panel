'use strict';

System.register(['lodash', 'jquery', 'moment', 'app/core/utils/file_export', 'app/plugins/sdk', './transformers', './form_ctrl', './utils', './editor', './column_options', './renderer', './css/style.css!', './css/bootstrap-slider.css!', './css/instant-search.css!'], function (_export, _context) {
  "use strict";

  var _, $, moment, FileExport, MetricsPanelCtrl, transformDataToTable, showForm, utils, tablePanelEditor, columnOptionsTab, TableRenderer, _createClass, _get, timestamp, _ctrl, panelDefaults, TableCtrl, refreshPanel, getQueryMeasurement, getReasonCodeEndPoint, getEquipmentEndPoint, isReadyToWriteInData;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_jquery) {
      $ = _jquery.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreUtilsFile_export) {
      FileExport = _appCoreUtilsFile_export;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_transformers) {
      transformDataToTable = _transformers.transformDataToTable;
    }, function (_form_ctrl) {
      showForm = _form_ctrl.showForm;
    }, function (_utils) {
      utils = _utils;
    }, function (_editor) {
      tablePanelEditor = _editor.tablePanelEditor;
    }, function (_column_options) {
      columnOptionsTab = _column_options.columnOptionsTab;
    }, function (_renderer) {
      TableRenderer = _renderer.TableRenderer;
    }, function (_cssStyleCss) {}, function (_cssBootstrapSliderCss) {}, function (_cssInstantSearchCss) {}],
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

      _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
          var parent = Object.getPrototypeOf(object);

          if (parent === null) {
            return undefined;
          } else {
            return get(parent, property, receiver);
          }
        } else if ("value" in desc) {
          return desc.value;
        } else {
          var getter = desc.get;

          if (getter === undefined) {
            return undefined;
          }

          return getter.call(receiver);
        }
      };

      timestamp = void 0;
      _ctrl = void 0;
      panelDefaults = {
        targets: [{}],
        transform: 'timeseries_to_columns',
        pageSize: null,
        showHeader: true,
        styles: [{
          type: 'date',
          pattern: 'Time',
          alias: 'Time',
          dateFormat: 'YYYY-MM-DD HH:mm:ss',
          headerColor: "rgba(51, 181, 229, 1)"
        }, {
          unit: 'short',
          type: 'number',
          alias: '',
          decimals: 2,
          headerColor: "rgba(51, 181, 229, 1)",
          colors: ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
          colorMode: null,
          pattern: '/.*/',
          thresholds: []
        }],
        columns: [],
        scroll: true,
        fontSize: '100%',
        sort: { col: 0, desc: true }
      };

      _export('TableCtrl', TableCtrl = function (_MetricsPanelCtrl) {
        _inherits(TableCtrl, _MetricsPanelCtrl);

        function TableCtrl($scope, $injector, templateSrv, annotationsSrv, $sanitize, variableSrv, $sce) {
          _classCallCheck(this, TableCtrl);

          var _this = _possibleConstructorReturn(this, (TableCtrl.__proto__ || Object.getPrototypeOf(TableCtrl)).call(this, $scope, $injector));

          _this.pageIndex = 0;
          _ctrl = _this;

          if (_this.panel.styles === void 0) {
            _this.panel.styles = _this.panel.columns;
            _this.panel.columns = _this.panel.fields;
            delete _this.panel.columns;
            delete _this.panel.fields;
          }

          _.defaults(_this.panel, panelDefaults);

          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('init-panel-actions', _this.onInitPanelActions.bind(_this));

          _this.panel.camundaUrl = $sce.trustAsResourceUrl(utils.camundaHost);
          _this.panel.measurementOK = false;

          $(document).off('click', 'tr.tr-affect#event-editor-table-tr-id');
          //Show form if a row is clicked
          $(document).on('click', 'tr.tr-affect#event-editor-table-tr-id', function () {
            var rawData = $('td', this).map(function (index, td) {

              if (td.childNodes.length === 2) {
                return td.childNodes[1].nodeValue;
              } else if (td.childNodes.length === 1) {
                return $(td).text();
              } else {
                return '';
              }
            });

            var timeIndex = $scope.ctrl.colDimensions.indexOf("Time");
            if (!~timeIndex) {
              utils.alert('error', 'Error', 'Get not get this event from the database because TIME NOT FOUND, please contact the dev team, or try to NOT hide the time column');
              return;
            } else {
              var date = rawData[0];
              timestamp = moment(date).valueOf() * 1000000;
              showForm(timestamp);
            }
          });

          _this.errorLogged = false;
          _this.durationMissingErrorLogged = false;
          _this.postgresConnectionErrorLogged = false;
          _this.parentUpdated = false;
          return _this;
        }

        _createClass(TableCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', tablePanelEditor, 2);
            this.addEditorTab('Column Styles', columnOptionsTab, 3);
          }
        }, {
          key: 'onInitPanelActions',
          value: function onInitPanelActions(actions) {
            actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' });
          }
        }, {
          key: 'issueQueries',
          value: function issueQueries(datasource) {
            this.pageIndex = 0;

            if (this.panel.transform === 'annotations') {
              this.setTimeQueryStart();
              return this.annotationsSrv.getAnnotations({
                dashboard: this.dashboard,
                panel: this.panel,
                range: this.range
              }).then(function (annotations) {
                return { data: annotations };
              });
            }

            return _get(TableCtrl.prototype.__proto__ || Object.getPrototypeOf(TableCtrl.prototype), 'issueQueries', this).call(this, datasource);
          }
        }, {
          key: 'onDataError',
          value: function onDataError(err) {
            this.dataRaw = [];
            this.render();
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            if (dataList.length !== 0) {
              this.handle(dataList[0]);
            }

            if (this.panel.hideExecute) {
              if (dataList.length !== 0) {
                dataList = this.filterExecute(dataList);
              }
            }

            this.dataRaw = dataList;
            this.pageIndex = 0;
            // automatically correct transform mode based on data
            if (this.dataRaw && this.dataRaw.length) {
              if (this.dataRaw[0].type === 'table') {
                this.panel.transform = 'table';
              } else {
                if (this.dataRaw[0].type === 'docs') {
                  this.panel.transform = 'json';
                } else {
                  if (this.panel.transform === 'table' || this.panel.transform === 'json') {
                    this.panel.transform = 'timeseries_to_rows';
                  }
                }
              }
            }

            this.checkEndPoint(this.panel.endPoint);
            this.render();
          }
        }, {
          key: 'filterExecute',
          value: function filterExecute(data) {
            var filteredData = void 0;
            if (data[0].columns !== null && data[0].columns !== undefined) {
              var indexOfexecute = data[0].columns.findIndex(function (x) {
                return x.text.toLowerCase() === 'execute';
              });
              var filteredRows = data[0].rows.filter(function (row) {
                return row[indexOfexecute] !== 1;
              });
              data[0].rows = filteredRows;
              filteredData = data;
            }
            return filteredData;
          }
        }, {
          key: 'handle',
          value: function handle(data) {
            var _this2 = this;

            if (data !== undefined) {
              if (data.type === 'table') {
                var cols = data.columns.reduce(function (arr, col) {
                  var text = col.text.toLowerCase();
                  arr.push(text);
                  return arr;
                }, []);
                if (cols.indexOf('duration') !== -1) {
                  //contains duration, continue
                  var allRecords = this.getRecords(cols, data.rows);
                  console.log(allRecords);
                  var allTimestamps = allRecords.reduce(function (arr, record) {
                    var timestamp = record.time;
                    arr.push(timestamp);
                    return arr;
                  }, []);
                  //only works for ones that are with duration === null
                  var recordsToUpdate = allRecords.filter(function (record) {
                    return record.duration === null || record.duration === undefined;
                  });
                  if (recordsToUpdate.length === 0) {
                    //The newest records must be updated no matter what, push it to the list
                    recordsToUpdate.push(allRecords[allRecords.length - 1]);
                  }
                  if (recordsToUpdate[recordsToUpdate.length - 1].time !== allRecords[allRecords.length - 1].time) {
                    //The newest records must be updated no matter what, push it to the list
                    recordsToUpdate.push(allRecords[allRecords.length - 1]);
                    // console.log('update newest one')
                  }
                  recordsToUpdate.forEach(function (record) {
                    console.log(allTimestamps);
                    console.log(record.time);
                    console.log(allTimestamps.indexOf(record.time) === allTimestamps.length - 1);
                    if (allTimestamps.indexOf(record.time) === allTimestamps.length - 1) {
                      //The most updated record, calculate the duration by now()
                      var difference = new Date().getTime() - record.time;
                      console.log('record time', record.time);
                      var duration = _this2.getDuration(difference);
                      var line = _this2.getInfluxLine(record, duration, difference);
                      // console.log(record);
                      var url = utils.influxHost + 'write?db=smart_factory';
                      utils.post(url, line).then(function (res) {
                        // console.log(res)
                      }).catch(function (e) {
                        console.log(e);
                        if (!_this2.postgresConnectionErrorLogged) {
                          utils.alert('error', 'Error', 'Unexpected error occurred while connection to the influx database');
                        }
                        _this2.postgresConnectionErrorLogged = true;
                      });
                    } else {
                      //other records
                      var _difference = allTimestamps[allTimestamps.indexOf(record.time) + 1] - record.time;
                      console.log('record time 2', record.time);
                      var _duration = _this2.getDuration(_difference);
                      var _line = _this2.getInfluxLine(record, _duration, _difference);
                      //   console.log('other updated');
                      //   console.log(line);
                      var _url = utils.influxHost + 'write?db=smart_factory';
                      utils.post(_url, _line).then(function (res) {
                        // console.log(res)
                      }).catch(function (e) {
                        console.log(e);
                        if (!_this2.postgresConnectionErrorLogged) {
                          utils.alert('error', 'Error', 'Unexpected error occurred while connection to the influx database');
                        }
                        _this2.postgresConnectionErrorLogged = true;
                      });
                    }
                  });
                } else {
                  //There is no column name duration
                  if (!this.durationMissingErrorLogged) {
                    console.log('To calculate the duration of each event, the column name must be named as duration, both upper and lower cases would work');
                  }
                  this.durationMissingErrorLogged = true;
                }
              } else {
                //The table format is not TABLE
                if (!this.errorLogged) {
                  console.log('To calculate the duration of each event, please format the data as a TABLE');
                }
                this.errorLogged = true;
              }
            }
          }
        }, {
          key: 'getRecords',
          value: function getRecords(cols, rows) {
            var records = [];
            for (var i = 0; i < rows.length; i++) {
              var row = rows[i];
              var record = {};
              for (var k = 0; k < cols.length; k++) {
                var col = cols[k];
                record[col] = row[k];
              }
              records.push(record);
            }
            return records;
          }
        }, {
          key: 'checkEndPoint',
          value: function checkEndPoint(key) {
            var _this3 = this;

            var influxUrl = utils.influxHost + ('query?pretty=true&db=smart_factory&q=select * from ' + key);
            utils.get(influxUrl).then(function (res) {
              if (!res.results[0].series) {
                _this3.panel.measurementOK = false;
                utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query");
                return;
              }
              console.log(res);
              if (!res.results[0].series[0].columns.includes('held')) {
                _this3.panel.measurementOK = false;
                utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query");
                return;
              }
              _this3.panel.measurementOK = true;
            }).catch(function () {
              _this3.panel.measurementOK = false;
              utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query");
              return;
            });
          }
        }, {
          key: 'getDuration',
          value: function getDuration(difference) {

            console.log('diff', difference);

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
        }, {
          key: 'getInfluxLine',
          value: function getInfluxLine(record, duration, durationInt) {
            if (!this.panel.measurementOK) {
              console.log('not writing 1');
              return;
            }
            var measurement = this.panel.endPoint;
            var line = measurement + ',Site=' + utils.addSlash(record.site, ' ') + ',Area=' + utils.addSlash(record.area, ' ') + ',Line=' + utils.addSlash(record.line, ' ') + ' ';

            line += 'stopped=' + record.stopped + ',';
            line += 'idle=' + record.idle + ',';
            line += 'execute=' + record.execute + ',';
            line += 'held=' + record.held + ',';

            console.log(record);
            // if(record.complete !== null || record.complete !== undefined) {
            //   line += 'complete=' + record.complete + ','
            // }

            if (record.status !== null && record.status !== undefined) {
              line += 'status="' + record.status + '"' + ',';
            }

            if (record.MachineState !== null && record.MachineState !== undefined) {
              line += 'MachineState="' + record.MachineState + '"' + ',';
            }

            if (record.actual_rate !== null && record.actual_rate !== undefined) {
              line += 'actual_rate=' + record.actual_rate + ',';
            }

            if (record.rid !== null && record.rid !== undefined) {
              line += 'rid="' + record.rid + '"' + ',';
            }

            if (record.MachineState !== null && record.MachineState !== undefined) {
              line += 'MachineState="' + record.MachineState + '"' + ',';
            }

            if (record.parentReason !== null && record.parentReason !== undefined) {
              line += 'parentReason="' + record.parentReason + '"' + ',';
            }

            if (record.category !== null && record.category !== undefined) {
              line += 'category="' + record.category + '"' + ',';
            }

            if (record.reason !== null && record.reason !== undefined) {
              line += 'reason="' + record.reason + '"' + ',';
            }

            line += 'durationInt=' + durationInt + ',';
            line += 'duration="' + duration + '"' + ' ';

            line += record.time * 1000000;

            console.log('line1', line);
            return line;
          }
        }, {
          key: 'normalInfluxLine',
          value: function normalInfluxLine(record) {
            if (!this.panel.measurementOK) {
              console.log('not writing');
              return;
            }
            var measurement = this.panel.endPoint;
            var line = measurement + ',Site=' + utils.addSlash(record.site, ' ') + ',Area=' + utils.addSlash(record.area, ' ') + ',Line=' + utils.addSlash(record.line, ' ') + ' ';

            line += 'stopped=' + record.stopped + ',';
            line += 'idle=' + record.idle + ',';
            line += 'execute=' + record.execute + ',';
            line += 'held=' + record.held + ',';

            console.log(record);
            // if(record.complete !== null || record.complete !== undefined) {
            //   line += 'complete=' + record.complete + ','
            // }

            if (record.MachineState !== null && record.MachineState !== undefined) {
              line += 'MachineState="' + record.MachineState + '"' + ',';
            }

            if (record.rid !== null && record.rid !== undefined) {
              line += 'rid="' + record.rid + '"' + ',';
            }

            if (record.actual_rate !== null && record.actual_rate !== undefined) {
              line += 'actual_rate=' + record.actual_rate + ',';
            }

            if (record.status !== null && record.status !== undefined) {
              line += 'status="' + record.status + '"' + ',';
            }

            if (record.category !== null && record.category !== undefined) {
              line += 'category="' + record.category + '"' + ',';
            }

            if (record.reason !== null && record.reason !== undefined) {
              line += 'reason="' + record.reason + '"' + ',';
              line += 'parentReason="' + record.reason.split(' | ')[0] + '"' + ',';
            }

            if (record.durationInt !== null && record.durationInt !== undefined) {
              line += 'durationInt=' + record.durationInt + ',';
            }

            if (record.duration !== null && record.duration !== undefined) {
              line += 'duration="' + record.duration + '"' + ',';
            }

            line += record.time * 1000000;

            console.log('line2', line);

            return line;
          }
        }, {
          key: 'render',
          value: function render() {
            this.table = transformDataToTable(this.dataRaw, this.panel);
            // console.log(this.panel.sort);
            this.table.sort(this.panel.sort);
            // console.log(this.panel.sort);
            this.renderer = new TableRenderer(this.panel, this.table, this.dashboard.isTimezoneUtc(), this.$sanitize, this.templateSrv, this.col);

            return _get(TableCtrl.prototype.__proto__ || Object.getPrototypeOf(TableCtrl.prototype), 'render', this).call(this, this.table);
          }
        }, {
          key: 'toggleColumnSort',
          value: function toggleColumnSort(col, colIndex) {
            // remove sort flag from current column
            if (this.table.columns[this.panel.sort.col]) {
              this.table.columns[this.panel.sort.col].sort = false;
            }

            if (this.panel.sort.col === colIndex) {
              if (this.panel.sort.desc) {
                this.panel.sort.desc = false;
              } else {
                this.panel.sort.col = null;
              }
            } else {
              this.panel.sort.col = colIndex;
              this.panel.sort.desc = true;
            }
            this.render();
          }
        }, {
          key: 'exportCsv',
          value: function exportCsv() {
            var scope = this.$scope.$new(true);
            scope.tableData = this.renderer.render_values();
            scope.panel = 'table';
            this.publishAppEvent('show-modal', {
              templateHtml: '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
              scope: scope,
              modalClass: 'modal--narrow'
            });
          }
        }, {
          key: 'link',
          value: function link(scope, elem, attrs, ctrl) {
            var data = void 0;
            var panel = ctrl.panel;
            var pageCount = 0;

            function getTableHeight() {
              var panelHeight = ctrl.height;

              if (pageCount > 1) {
                panelHeight -= 26;
              }

              return panelHeight - 31 + 'px';
            }

            function appendTableRows(tbodyElem) {
              ctrl.renderer.setTable(data);
              tbodyElem.empty();
              tbodyElem.html(ctrl.renderer.render(ctrl.pageIndex));
            }

            function switchPage(e) {
              var el = $(e.currentTarget);
              ctrl.pageIndex = parseInt(el.text(), 10) - 1;
              renderPanel();
            }

            function appendPaginationControls(footerElem) {
              footerElem.empty();

              var pageSize = panel.pageSize || 100;
              pageCount = Math.ceil(data.rows.length / pageSize);
              if (pageCount === 1) {
                return;
              }

              var startPage = Math.max(ctrl.pageIndex - 3, 0);
              var endPage = Math.min(pageCount, startPage + 9);

              var paginationList = $('<ul></ul>');

              for (var i = startPage; i < endPage; i++) {
                var activeClass = i === ctrl.pageIndex ? 'active' : '';
                var pageLinkElem = $('<li><a class="table-panel-page-link pointer ' + activeClass + '">' + (i + 1) + '</a></li>');
                paginationList.append(pageLinkElem);
              }

              footerElem.append(paginationList);
            }

            function renderPanel() {
              var panelElem = elem.parents('.panel-content');
              var rootElem = elem.find('.table-panel-scroll');
              var tbodyElem = elem.find('tbody');
              var footerElem = elem.find('.table-panel-footer');

              elem.css({ 'font-size': panel.fontSize });
              panelElem.addClass('table-panel-content');

              appendTableRows(tbodyElem);
              appendPaginationControls(footerElem);

              rootElem.css({ 'max-height': panel.scroll ? getTableHeight() : '' });

              // get current table column dimensions 
              if (ctrl.table.columns) {
                ctrl.colDimensions = ctrl.table.columns.filter(function (x) {
                  return !x.hidden;
                }).map(function (x) {
                  return x.text;
                });
              }
            }

            // hook up link tooltips
            elem.tooltip({
              selector: '[data-link-tooltip]'
            });

            function addFilterClicked(e) {
              var filterData = $(e.currentTarget).data();
              var options = {
                datasource: panel.datasource,
                key: data.columns[filterData.column].text,
                value: data.rows[filterData.row][filterData.column],
                operator: filterData.operator
              };

              ctrl.variableSrv.setAdhocFilter(options);
            }

            elem.on('click', '.table-panel-page-link', switchPage);
            elem.on('click', '.table-panel-filter-link', addFilterClicked);

            var unbindDestroy = scope.$on('$destroy', function () {
              elem.off('click', '.table-panel-page-link');
              elem.off('click', '.table-panel-filter-link');
              unbindDestroy();
            });

            ctrl.events.on('render', function (renderData) {
              data = renderData || data;
              if (data) {
                renderPanel();
              }
              ctrl.renderingCompleted();
            });
          }
        }]);

        return TableCtrl;
      }(MetricsPanelCtrl));

      _export('TableCtrl', TableCtrl);

      _export('refreshPanel', refreshPanel = function refreshPanel() {
        _ctrl.refresh();
      });

      _export('refreshPanel', refreshPanel);

      _export('getQueryMeasurement', getQueryMeasurement = function getQueryMeasurement() {
        return _ctrl.panel.endPoint;
      });

      _export('getQueryMeasurement', getQueryMeasurement);

      _export('getReasonCodeEndPoint', getReasonCodeEndPoint = function getReasonCodeEndPoint() {
        return _ctrl.panel.reasonCodeEndPoint;
      });

      _export('getReasonCodeEndPoint', getReasonCodeEndPoint);

      _export('getEquipmentEndPoint', getEquipmentEndPoint = function getEquipmentEndPoint() {
        return _ctrl.panel.equipmentEndPoint;
      });

      _export('getEquipmentEndPoint', getEquipmentEndPoint);

      _export('isReadyToWriteInData', isReadyToWriteInData = function isReadyToWriteInData() {
        return _ctrl.panel.measurementOK;
      });

      _export('isReadyToWriteInData', isReadyToWriteInData);

      TableCtrl.templateUrl = './partials/module.html';
    }
  };
});
//# sourceMappingURL=table_ctrl.js.map
