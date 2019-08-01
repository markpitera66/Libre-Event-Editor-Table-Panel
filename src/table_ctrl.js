import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import * as FileExport from 'app/core/utils/file_export';
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import {transformDataToTable} from './transformers';
import {showForm} from './form_ctrl'
import * as utils from './utils'
import {tablePanelEditor} from './editor';
import {columnOptionsTab} from './column_options';
import {TableRenderer} from './renderer';

import './css/style.css!';
import './css/bootstrap-slider.css!';
import './css/instant-search.css!';

let timestamp
let _ctrl

const panelDefaults = {
  targets: [{}],
  transform: 'timeseries_to_columns',
  pageSize: null,
  showHeader: true,
  styles: [
    {
      type: 'date',
      pattern: 'Time',
      alias: 'Time',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      headerColor: "rgba(51, 181, 229, 1)"
    },
    {
      unit: 'short',
      type: 'number',
      alias: '',
      decimals: 2,
      headerColor: "rgba(51, 181, 229, 1)",
      colors: ["rgba(245, 54, 54, 0.9)", "rgba(237, 129, 40, 0.89)", "rgba(50, 172, 45, 0.97)"],
      colorMode: null,
      pattern: '/.*/',
      thresholds: [],
    }
  ],
  columns: [],
  scroll: true,
  fontSize: '100%',
  sort: { col: 0, desc: true },
};

export class TableCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, templateSrv, annotationsSrv, $sanitize, variableSrv, $sce) {
    super($scope, $injector);

    this.pageIndex = 0;
    _ctrl = this

    if (this.panel.styles === void 0) {
      this.panel.styles = this.panel.columns;
      this.panel.columns = this.panel.fields;
      delete this.panel.columns;
      delete this.panel.fields;
    }

    _.defaults(this.panel, panelDefaults);

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this));

    this.panel.camundaUrl = $sce.trustAsResourceUrl(utils.camundaHost)
    this.panel.measurementOK = false

    $(document).off('click', 'tr.tr-affect#event-editor-table-tr-id')
    //Show form if a row is clicked
    $(document).on('click', 'tr.tr-affect#event-editor-table-tr-id', function () {
      const rawData = $('td', this).map((index, td)=>{
        
        if (td.childNodes.length === 2) {
          return td.childNodes[1].nodeValue
        }else if (td.childNodes.length === 1) {
          return $(td).text()
        }else {
          return ''
        }

      })

      const timeIndex = $scope.ctrl.colDimensions.indexOf("Time")
      if (!~timeIndex) {
        utils.alert('error', 'Error', 'Get not get this event from the database because TIME NOT FOUND, please contact the dev team, or try to NOT hide the time column')
        return
      }else {
        let date = rawData[0]
        timestamp = moment(date).valueOf() * 1000000
        showForm(timestamp)     
      }
    })

    this.errorLogged = false
    this.durationMissingErrorLogged = false
    this.postgresConnectionErrorLogged = false
    this.parentUpdated = false
  }

  onInitEditMode() {
    this.addEditorTab('Options', tablePanelEditor, 2);
    this.addEditorTab('Column Styles', columnOptionsTab, 3);
  }

  onInitPanelActions(actions) {
    actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' });
  }

  issueQueries(datasource) {
    this.pageIndex = 0;

    if (this.panel.transform === 'annotations') {
      this.setTimeQueryStart();
      return this.annotationsSrv
        .getAnnotations({
          dashboard: this.dashboard,
          panel: this.panel,
          range: this.range,
        })
        .then(annotations => {
          return { data: annotations };
        });
    }

    return super.issueQueries(datasource);
  }

  onDataError(err) {
    this.dataRaw = [];
    this.render();
  }

  onDataReceived(dataList) {
    if (dataList.length !== 0) {
      this.handle(dataList[0])
    }

    if(this.panel.hideExecute){
      if (dataList.length !== 0) {
          dataList = this.filterExecute(dataList)
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

    this.checkEndPoint(this.panel.endPoint)
    this.render();
  }

  filterExecute(data){
    let filteredData;
    if (data[0].columns !== null && data[0].columns !== undefined) {
      let indexOfexecute = data[0].columns.findIndex(x => x.text.toLowerCase() === 'execute')
      let filteredRows = data[0].rows.filter(row => row[indexOfexecute] !== 1)
      data[0].rows = filteredRows
      filteredData = data
    }
    return filteredData;
  }

  handle(data){
    if (data !== undefined) {
      if (data.type === 'table') {
        let cols = data.columns.reduce((arr, col) => {
          let text = col.text.toLowerCase()
          arr.push(text)
          return arr
        }, [])
        if (cols.indexOf('duration') !== -1) {
          //contains duration, continue
          let allRecords = this.getRecords(cols, data.rows)
          console.log(allRecords)
          let allTimestamps = allRecords.reduce((arr, record) => {
            let timestamp = record.time
            arr.push(timestamp)
            return arr
          }, [])
          //only works for ones that are with duration === null
          let recordsToUpdate = allRecords.filter(record => record.duration === null || record.duration === undefined)
          if (recordsToUpdate.length === 0) {
            //The newest records must be updated no matter what, push it to the list
            recordsToUpdate.push(allRecords[allRecords.length - 1])
          }
          if (recordsToUpdate[recordsToUpdate.length -1].time !== allRecords[allRecords.length - 1].time) {
            //The newest records must be updated no matter what, push it to the list
            recordsToUpdate.push(allRecords[allRecords.length - 1])
            // console.log('update newest one')
          }
          recordsToUpdate.forEach(record => {
            console.log(allTimestamps)
            console.log(record.time)
            console.log(allTimestamps.indexOf(record.time))
            if (record.time === allTimestamps[allTimestamps.length - 1]) {
              //The most updated record, calculate the duration by now()
              let difference = new Date().getTime() - record.time
              console.log('record time', record.time)
              let duration = this.getDuration(difference)
              let line = this.getInfluxLine(record, duration, difference)
              // console.log(record);
              let url = utils.influxHost + 'write?db=smart_factory'
              utils.post(url, line).then(res => {
                // console.log(res)
              }).catch(e => {
                console.log(e)
                if (!this.postgresConnectionErrorLogged) {
                    utils.alert('error', 'Error', 'Unexpected error occurred while connection to the influx database')
                }
                this.postgresConnectionErrorLogged = true
              })
            }else {
              //other records
              let difference = allTimestamps[allTimestamps.indexOf(record.time) + 1] - record.time
              console.log('record time 2', record.time)
              let duration = this.getDuration(difference)
              let line = this.getInfluxLine(record, duration, difference)
            //   console.log('other updated');
            //   console.log(line);
              let url = utils.influxHost + 'write?db=smart_factory'
              utils.post(url, line).then(res => {
                // console.log(res)
              }).catch(e => {
                console.log(e)
                if (!this.postgresConnectionErrorLogged) {
                    utils.alert('error', 'Error', 'Unexpected error occurred while connection to the influx database')
                }
                this.postgresConnectionErrorLogged = true
              })
            }
          })
        }else {
          //There is no column name duration
          if (!this.durationMissingErrorLogged){
            console.log('To calculate the duration of each event, the column name must be named as duration, both upper and lower cases would work')
          }
          this.durationMissingErrorLogged = true
        }
      }else {
        //The table format is not TABLE
        if (!this.errorLogged) {
          console.log('To calculate the duration of each event, please format the data as a TABLE')
        }
        this.errorLogged = true
      }
    }
  }

  getRecords(cols, rows){
    let records = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let record = {}
      for (let k = 0; k < cols.length; k++) {
        const col = cols[k];
        record[col] = row[k]
      }
      records.push(record)
    }
    return records
  }

  checkEndPoint(key) {
    let influxUrl = utils.influxHost + `query?pretty=true&db=smart_factory&q=select * from ${key}`
    utils.get(influxUrl).then(res => {
      if(!res.results[0].series){
        this.panel.measurementOK = false
        utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query")
        return
      } 
      console.log(res)
      if(!res.results[0].series[0].columns.includes('held')){
        this.panel.measurementOK = false
        utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query")
        return
      }
      this.panel.measurementOK = true
    }).catch(() => {
      this.panel.measurementOK = false
      utils.alert('error', 'Error', "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query")
      return
    })
  }

  getDuration(difference){

    console.log('diff', difference)

    const milSecs = parseInt(difference%1000)

    const daysDiff = Math.floor(difference/1000/60/60/24)
    difference -= daysDiff*1000*60*60*24

    let hrsDiff = Math.floor(difference/1000/60/60)
    difference -= hrsDiff*1000*60*60

    const minsDiff = ('0' + (Math.floor(difference/1000/60))).slice(-2)
    difference -= minsDiff*1000*60

    const secsDiff = ('0' + (Math.floor(difference/1000))).slice(-2)
    difference -= minsDiff*1000

    let timeToAdd = daysDiff * 24
    hrsDiff = hrsDiff + timeToAdd
    hrsDiff = (hrsDiff < 10) ? '0' + hrsDiff : hrsDiff

    return hrsDiff + ':' + minsDiff + ':' + secsDiff + '.' + milSecs
  }

  getInfluxLine(record, duration, durationInt){
    if (!this.panel.measurementOK) {
      console.log('not writing 1')
      return
    }
    const measurement = this.panel.endPoint
    let line = measurement + ',Site=' + utils.addSlash(record.site, ' ') + ',Area=' + utils.addSlash(record.area, ' ') + ',Line=' + utils.addSlash(record.line, ' ') + ' '

    line += 'stopped=' + record.stopped + ','
    line += 'idle=' + record.idle + ','
    line += 'execute=' + record.execute + ','
    line += 'held=' + record.held + ','
    
    console.log(record)
    // if(record.complete !== null || record.complete !== undefined) {
    //   line += 'complete=' + record.complete + ','
    // }

    if (record.status !== null && record.status !== undefined) {
      line += 'status="' + record.status + '"' + ','
    }

    if (record.MachineState !== null && record.MachineState !== undefined) {
      line += 'MachineState="' + record.MachineState + '"' + ','
    }

    if (record.actual_rate !== null && record.actual_rate !== undefined) {
      line += 'actual_rate=' + record.actual_rate + ','
    }

    if (record.rid !== null && record.rid !== undefined) {
      line += 'rid="' + record.rid + '"' + ','
    }

    if (record.MachineState !== null && record.MachineState !== undefined) {
      line += 'MachineState="' + record.MachineState + '"' + ','
    }
    
    if (record.parentReason !== null && record.parentReason !== undefined) {
      line += 'parentReason="' + record.parentReason + '"' + ','
    }

    if (record.category !== null && record.category !== undefined) {
      line += 'category="' + record.category + '"' + ','
    }
    
    if (record.reason !== null && record.reason !== undefined) {
      line += 'reason="' + record.reason + '"' + ','
    }

    line += 'durationInt=' + durationInt + ','
    line += 'duration="' + duration + '"' + ' '
    
    line += record.time * 1000000
    
    console.log('line1' , line)
    return line
  }

  normalInfluxLine(record){
    if (!this.panel.measurementOK) {
      console.log('not writing')
      return
    }
    const measurement = this.panel.endPoint
    let line = measurement + ',Site=' + utils.addSlash(record.site, ' ') + ',Area=' + utils.addSlash(record.area, ' ') + ',Line=' + utils.addSlash(record.line, ' ') + ' '

    line += 'stopped=' + record.stopped + ','
    line += 'idle=' + record.idle + ','
    line += 'execute=' + record.execute + ','
    line += 'held=' + record.held + ','

    console.log(record)
    // if(record.complete !== null || record.complete !== undefined) {
    //   line += 'complete=' + record.complete + ','
    // }

    if (record.MachineState !== null && record.MachineState !== undefined) {
      line += 'MachineState="' + record.MachineState + '"' + ','
    }

    if (record.rid !== null && record.rid !== undefined) {
      line += 'rid="' + record.rid + '"' + ','
    }

    if (record.actual_rate !== null && record.actual_rate !== undefined) {
      line += 'actual_rate=' + record.actual_rate + ','
    }

    if (record.status !== null && record.status !== undefined) {
      line += 'status="' + record.status + '"' + ','
    }

    if (record.category !== null && record.category !== undefined) {
      line += 'category="' + record.category + '"' + ','
    }
    
    if (record.reason !== null && record.reason !== undefined) {
      line += 'reason="' + record.reason + '"' + ','
      line += 'parentReason="' + record.reason.split(' | ')[0] + '"' + ','
    }

    if (record.durationInt !== null && record.durationInt !== undefined) {
      line += 'durationInt=' + record.durationInt + ','
    }

    if (record.duration !== null && record.duration !== undefined) {
      line += 'duration="' + record.duration + '"' + ','
    }
    
    line += record.time * 1000000
  
    console.log('line2' , line)

    return line
  }

  render() {
    this.table = transformDataToTable(this.dataRaw, this.panel);
    // console.log(this.panel.sort);
    this.table.sort(this.panel.sort);
    // console.log(this.panel.sort);
    this.renderer = new TableRenderer(
      this.panel,
      this.table,
      this.dashboard.isTimezoneUtc(),
      this.$sanitize,
      this.templateSrv,
      this.col
    );

    return super.render(this.table);
  }

  toggleColumnSort(col, colIndex) {
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

  exportCsv() {
    const scope = this.$scope.$new(true);
    scope.tableData = this.renderer.render_values();
    scope.panel = 'table';
    this.publishAppEvent('show-modal', {
      templateHtml: '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow',
    });
  }

  link(scope, elem, attrs, ctrl) {
    let data;
    const panel = ctrl.panel;
    let pageCount = 0;

    function getTableHeight() {
      let panelHeight = ctrl.height;

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
      const el = $(e.currentTarget);
      ctrl.pageIndex = parseInt(el.text(), 10) - 1;
      renderPanel();
    }

    function appendPaginationControls(footerElem) {
      footerElem.empty();

      const pageSize = panel.pageSize || 100;
      pageCount = Math.ceil(data.rows.length / pageSize);
      if (pageCount === 1) {
        return;
      }

      const startPage = Math.max(ctrl.pageIndex - 3, 0);
      const endPage = Math.min(pageCount, startPage + 9);

      const paginationList = $('<ul></ul>');

      for (let i = startPage; i < endPage; i++) {
        const activeClass = i === ctrl.pageIndex ? 'active' : '';
        const pageLinkElem = $(
          '<li><a class="table-panel-page-link pointer ' + activeClass + '">' + (i + 1) + '</a></li>'
        );
        paginationList.append(pageLinkElem);
      }

      footerElem.append(paginationList);
    }

    function renderPanel() {
      const panelElem = elem.parents('.panel-content');
      const rootElem = elem.find('.table-panel-scroll');
      const tbodyElem = elem.find('tbody');
      const footerElem = elem.find('.table-panel-footer');

      elem.css({ 'font-size': panel.fontSize });
      panelElem.addClass('table-panel-content');

      appendTableRows(tbodyElem);
      appendPaginationControls(footerElem);

      rootElem.css({ 'max-height': panel.scroll ? getTableHeight() : '' });

      // get current table column dimensions 
      if (ctrl.table.columns) {
        ctrl.colDimensions = ctrl.table.columns.filter(x => !x.hidden).map(x => x.text)
      }
    }

    // hook up link tooltips
    elem.tooltip({
      selector: '[data-link-tooltip]',
    });

    function addFilterClicked(e) {
      const filterData = $(e.currentTarget).data();
      const options = {
        datasource: panel.datasource,
        key: data.columns[filterData.column].text,
        value: data.rows[filterData.row][filterData.column],
        operator: filterData.operator,
      };

      ctrl.variableSrv.setAdhocFilter(options);
    }

    elem.on('click', '.table-panel-page-link', switchPage);
    elem.on('click', '.table-panel-filter-link', addFilterClicked);

    const unbindDestroy = scope.$on('$destroy', () => {
      elem.off('click', '.table-panel-page-link');
      elem.off('click', '.table-panel-filter-link');
      unbindDestroy();
    });

    ctrl.events.on('render', renderData => {
      data = renderData || data;
      if (data) {
        renderPanel();
      }
      ctrl.renderingCompleted();
    });
  }

}

export const refreshPanel = () => {
  _ctrl.refresh()
}

export const getQueryMeasurement = () => {
  return _ctrl.panel.endPoint
}

export const getReasonCodeEndPoint = () => {
  return _ctrl.panel.reasonCodeEndPoint
}

export const getEquipmentEndPoint = () => {
  return _ctrl.panel.equipmentEndPoint
}

export const isReadyToWriteInData = () => {
  return _ctrl.panel.measurementOK
}

TableCtrl.templateUrl = './partials/module.html';
