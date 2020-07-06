import _ from 'lodash'
import $ from 'jquery'
import moment from 'moment'
import { MetricsPanelCtrl } from 'app/plugins/sdk'
import { transformDataToTable } from './transformers'
import * as utils from './utils'
import { tablePanelEditor } from './editor'
import { columnOptionsTab } from './column_options'
import { TableRenderer } from './renderer'
import { FormOptionCtrl } from './form_option_ctrl'

import './css/style.css!'
import './css/bootstrap-slider.css!'
import './css/instant-search.css!'


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
      dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      headerColor: 'rgba(51, 181, 229, 1)'
    },
    {
      unit: 'short',
      type: 'number',
      alias: '',
      decimals: 2,
      headerColor: 'rgba(51, 181, 229, 1)',
      colors: ['rgba(245, 54, 54, 0.9)', 'rgba(237, 129, 40, 0.89)', 'rgba(50, 172, 45, 0.97)'],
      colorMode: null,
      pattern: '/.*/',
      thresholds: []
    }
  ],
  columns: [],
  scroll: true,
  fontSize: '100%',
  sort: { col: 0, desc: true },
  durationFilter: 3,
  hideExecute: true,
  reasonCodeEndPoint: 'reason_code',
  equipmentEndPoint: 'equipment',
  endPoint: 'Availability'
}

export class TableCtrl extends MetricsPanelCtrl {
  constructor ($scope, $injector, templateSrv, annotationsSrv, $sanitize, variableSrv, $sce) {
    super($scope, $injector)

    this.pageIndex = 0

    if (this.panel.styles === void 0) {
      this.panel.styles = this.panel.columns
      this.panel.columns = this.panel.fields
      delete this.panel.columns
      delete this.panel.fields
    }

    _.defaults(this.panel, panelDefaults)

    this.events.on('data-received', this.onDataReceived.bind(this))
    this.events.on('data-error', this.onDataError.bind(this))
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this))
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this))
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this))

    this.panel.camundaUrl = $sce.trustAsResourceUrl(utils.camundaHost)
    this.panel.measurementOK = false

    $(document).off('click', 'tr.tr-affect#event-editor-table-tr-id')
    // Show form if a row is clicked
    $(document).on('click', 'tr.tr-affect#event-editor-table-tr-id', function () {
      const rawData = $('td', this).map((index, td) => {
        if (td.childNodes.length === 2) {
          return td.childNodes[1].nodeValue
        } else if (td.childNodes.length === 1) {
          return $(td).text()
        } else {
          return ''
        }
      })

      const timeIndex = $scope.ctrl.colDimensions.indexOf('time')
      if (!~timeIndex) {
        utils.alert(
          'error',
          'Error',
          'Get not get this event from the database because TIME NOT FOUND, please contact the dev team, or try to NOT hide the time column'
        )
      } else {
        const date = rawData[timeIndex]
        const timestamp = moment(date).valueOf() * 1000000
        new FormOptionCtrl($scope.ctrl, timestamp).show()
      }
    })

    this.errorLogged = false
    this.durationMissingErrorLogged = false
    this.postgresConnectionErrorLogged = false
    this.parentUpdated = false
  }

  onInitEditMode () {
    this.addEditorTab('Options', tablePanelEditor, 2)
    this.addEditorTab('Column Styles', columnOptionsTab, 3)
  }

  onInitPanelActions (actions) {
    actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' })
  }

  issueQueries (datasource) {
    this.pageIndex = 0

    if (this.panel.transform === 'annotations') {
      this.setTimeQueryStart()
      return this.annotationsSrv
        .getAnnotations({
          dashboard: this.dashboard,
          panel: this.panel,
          range: this.range
        })
        .then((annotations) => {
          return { data: annotations }
        })
    }

    return super.issueQueries(datasource)
  }

  onDataError () {
    this.dataRaw = []
    this.render()
  }

  onDataReceived (dataList) {
    if (dataList.length === 0) {
      return
    }

    if (dataList.length !== 0) {
      this.allData = this.parseData(dataList[0].columns, dataList[0].rows)
      if (!this.allData[0].durationint) {
        // add durationint
        dataList[0] = this.calcDurationInt(dataList[0])
      } else {
        dataList[0] = this.calcDurationFormat(dataList[0])
      }
    }

    // check if is table
    if (dataList[0].type !== 'table') {
      utils.alert('Data must be formatted as a TABLE')
      return
    }

    if (this.panel.hideExecute) {
      if (dataList.length !== 0) {
        dataList = this.filterExecute(dataList)
      }
    }

    // filter shorter duration
    if (dataList.length !== 0) {
      if (this.panel.durationFilter) {
        if (isNaN(this.panel.durationFilter)) {
          this.panel.durationFilter = 3
        }
        dataList = this.filterDuration(this.panel.durationFilter, dataList)
      }
    }

    this.dataRaw = dataList
    this.pageIndex = 0
    // automatically correct transform mode based on data
    if (this.dataRaw && this.dataRaw.length) {
      if (this.dataRaw[0].type === 'table') {
        this.panel.transform = 'table'
      } else {
        if (this.dataRaw[0].type === 'docs') {
          this.panel.transform = 'json'
        } else {
          if (this.panel.transform === 'table' || this.panel.transform === 'json') {
            this.panel.transform = 'timeseries_to_rows'
          }
        }
      }
    }

    this.checkEndPoint(this.panel.endPoint)
    this.render()
  }

  calcDurationInt (data) {
    const _to = this.range.to.isAfter(moment()) ? moment() : this.range.to

    data.columns.splice(1, 0, { text: 'duration' })
    data.columns.splice(2, 0, { text: 'durationint' })

    let _prevTime = null
    for (let i = data.rows.length - 1; i >= 0; i--) {
      const row = data.rows[i]
      if (i === data.rows.length - 1) {
        // first one
        const diff = _to.diff(moment(row[0]))
        const duration = moment.duration(diff)
        const format = this.getDuration(diff)
        data.rows[i].splice(1, 0, format)
        data.rows[i].splice(2, 0, duration.valueOf())
        this.allData[i].duration = duration
        this.allData[i].durationFormat = format
      } else {
        const diff = _prevTime.diff(row[0])
        const duration = moment.duration(diff)
        const format = this.getDuration(diff)
        data.rows[i].splice(1, 0, format)
        data.rows[i].splice(2, 0, duration.valueOf())
        this.allData[i].duration = duration
        this.allData[i].durationFormat = format
      }
      _prevTime = moment(row[0])
    }
    return data
  }

  calcDurationFormat (data) {
    const _to = this.range.to.isAfter(moment()) ? moment() : this.range.to

    data.columns.splice(1, 0, { text: 'duration' })

    let _prevTime = null
    for (let i = data.rows.length - 1; i >= 0; i--) {
      const row = data.rows[i]
      if (i === data.rows.length - 1) {
        // first one
        const diff = _to.diff(moment(row[0]))
        const format = this.getDuration(diff)
        data.rows[i].splice(1, 0, format)
        this.allData[i].durationFormat = format
      } else {
        const diff = _prevTime.diff(row[0])
        const format = this.getDuration(diff)
        data.rows[i].splice(1, 0, format)
        this.allData[i].durationFormat = format
      }
      _prevTime = moment(row[0])
    }
    return data
  }

  filterExecute (data) {
    if (data[0].columns !== null && data[0].columns !== undefined) {
      const indexOfexecute = data[0].columns.findIndex((x) => x.text.toLowerCase() === 'execute')
      const filteredRows = data[0].rows.filter((row) => row[indexOfexecute] !== 1)
      data[0].rows = filteredRows
    }
    const filteredData = data
    return filteredData
  }

  filterDuration (minDur, data) {
    const minDurVal = moment.duration(minDur, 'minutes').valueOf()
    if (data[0].columns !== null && data[0].columns !== undefined) {
      const index = data[0].columns.findIndex((x) => x.text.toLowerCase() === 'durationint')
      if (!~index) {
        return data
      }
      const filteredRows = data[0].rows.filter((row) => row[index] >= minDurVal)
      data[0].rows = filteredRows
    }
    const filteredData = data
    return filteredData
  }

  parseData (cols, rows) {
    cols = cols.map((x) => x.text.toLowerCase())
    const data = []
    for (let i = 0; i < rows.length; i++) {
      const row = {}
      for (let k = 0; k < cols.length; k++) {
        row[cols[k]] = rows[i][k]
      }
      data.push(row)
    }
    return data
  }

  getRecords (cols, rows) {
    const records = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const record = {}
      for (let k = 0; k < cols.length; k++) {
        const col = cols[k]
        record[col] = row[k]
      }
      records.push(record)
    }
    return records
  }

  checkEndPoint (key) {
    const influxUrl = utils.influxHost + `query?pretty=true&db=smart_factory&q=select * from ${key} limit 1`
    utils
      .get(influxUrl)
      .then((res) => {
        if (!res.results[0].series) {
          this.panel.measurementOK = false
          utils.alert(
            'error',
            'Error',
            'No series found in out of metric query'
          )
          return
        }
        if (!res.results[0].series[0].columns.includes('status')) {
          this.panel.measurementOK = false
          utils.alert(
            'error',
            'Error',
            "Expected to find 'status' in out of metric query"
          )
          return
        }
        this.panel.measurementOK = true
      })
      .catch((err) => {
        this.panel.measurementOK = false
        utils.alert(
          'error',
          'Error',
          `Failed to query influx due to ${err}`
        )
      })
  }

  getDuration (difference) {
    const milSecs = parseInt(difference % 1000)

    const daysDiff = Math.floor(difference / 1000 / 60 / 60 / 24)
    difference -= daysDiff * 1000 * 60 * 60 * 24

    let hrsDiff = Math.floor(difference / 1000 / 60 / 60)
    difference -= hrsDiff * 1000 * 60 * 60

    const minsDiff = ('0' + Math.floor(difference / 1000 / 60)).slice(-2)
    difference -= minsDiff * 1000 * 60

    const secsDiff = ('0' + Math.floor(difference / 1000)).slice(-2)
    difference -= minsDiff * 1000

    const timeToAdd = daysDiff * 24
    hrsDiff = hrsDiff + timeToAdd
    hrsDiff = hrsDiff < 10 ? '0' + hrsDiff : hrsDiff

    return hrsDiff + ':' + minsDiff + ':' + secsDiff + '.' + milSecs
  }

  getInfluxLine (record, duration, durationInt) {
    if (!this.panel.measurementOK) {
      return
    }
    const measurement = this.panel.endPoint
    let line =
      measurement +
      ',Site=' +
      utils.addSlash(record.site, ' ') +
      ',Area=' +
      utils.addSlash(record.area, ' ') +
      ',Line=' +
      utils.addSlash(record.line, ' ') +
      ' '

    line += 'stopped=' + record.stopped + ','
    line += 'idle=' + record.idle + ','
    line += 'execute=' + record.execute + ','
    line += 'held=' + record.held + ','

    if (record.complete !== null && record.complete !== undefined) {
      line += 'complete=' + record.complete + ','
    }

    if (record.status !== null && record.status !== undefined) {
      line += 'status="' + record.status + '"' + ','
    }

    if (record.actual_rate !== null && record.actual_rate !== undefined) {
      line += 'actual_rate=' + record.actual_rate + ','
    }

    if (record.rid !== null && record.rid !== undefined) {
      line += 'rid_1="' + record.rid + '"' + ','
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

    return line
  }

  normalInfluxLine (record) {
    if (!this.panel.measurementOK) {
      return
    }
    const measurement = this.panel.endPoint
    let line =
      measurement +
      ',Site=' +
      utils.addSlash(record.site, ' ') +
      ',Area=' +
      utils.addSlash(record.area, ' ') +
      ',Line=' +
      utils.addSlash(record.line, ' ') +
      ' '

    line += 'stopped=' + record.stopped + ','
    line += 'idle=' + record.idle + ','
    line += 'execute=' + record.execute + ','
    line += 'held=' + record.held + ','

    if (record.complete !== null && record.complete !== undefined) {
      line += 'complete=' + record.complete + ','
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

    return line
  }

  render () {
    this.table = transformDataToTable(this.dataRaw, this.panel)
    this.table.sort(this.panel.sort)
    this.renderer = new TableRenderer(
      this.panel,
      this.table,
      this.dashboard.isTimezoneUtc(),
      this.$sanitize,
      this.templateSrv,
      this.col
    )

    return super.render(this.table)
  }

  toggleColumnSort (col, colIndex) {
    // remove sort flag from current column
    if (this.table.columns[this.panel.sort.col]) {
      this.table.columns[this.panel.sort.col].sort = false
    }

    if (this.panel.sort.col === colIndex) {
      if (this.panel.sort.desc) {
        this.panel.sort.desc = false
      } else {
        this.panel.sort.col = null
      }
    } else {
      this.panel.sort.col = colIndex
      this.panel.sort.desc = true
    }
    this.render()
  }

  exportCsv () {
    const scope = this.$scope.$new(true)
    scope.tableData = this.renderer.render_values()
    scope.panel = 'table'
    this.publishAppEvent('show-modal', {
      templateHtml: '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow'
    })
  }

  link (scope, elem, attrs, ctrl) {
    let data
    const panel = ctrl.panel
    let pageCount = 0

    function getTableHeight () {
      let panelHeight = ctrl.height

      if (pageCount > 1) {
        panelHeight -= 26
      }

      return panelHeight - 31 + 'px'
    }

    function appendTableRows (tbodyElem) {
      ctrl.renderer.setTable(data)
      tbodyElem.empty()
      tbodyElem.html(ctrl.renderer.render(ctrl.pageIndex))
    }

    function switchPage (e) {
      const el = $(e.currentTarget)
      ctrl.pageIndex = parseInt(el.text(), 10) - 1
      renderPanel()
    }

    function appendPaginationControls (footerElem) {
      footerElem.empty()

      const pageSize = panel.pageSize || 100
      pageCount = Math.ceil(data.rows.length / pageSize)
      if (pageCount === 1) {
        return
      }

      const startPage = Math.max(ctrl.pageIndex - 3, 0)
      const endPage = Math.min(pageCount, startPage + 9)

      const paginationList = $('<ul></ul>')

      for (let i = startPage; i < endPage; i++) {
        const activeClass = i === ctrl.pageIndex ? 'active' : ''
        const pageLinkElem = $(
          '<li><a class="table-panel-page-link pointer ' + activeClass + '">' + (i + 1) + '</a></li>'
        )
        paginationList.append(pageLinkElem)
      }

      footerElem.append(paginationList)
    }

    function renderPanel () {
      const panelElem = elem.parents('.panel-content')
      const rootElem = elem.find('.table-panel-scroll')
      const tbodyElem = elem.find('tbody')
      const footerElem = elem.find('.table-panel-footer')

      elem.css({ 'font-size': panel.fontSize })
      panelElem.addClass('table-panel-content')

      appendTableRows(tbodyElem)
      appendPaginationControls(footerElem)

      rootElem.css({ 'max-height': panel.scroll ? getTableHeight() : '' })

      // get current table column dimensions
      if (ctrl.table.columns) {
        ctrl.colDimensions = ctrl.table.columns.filter((x) => !x.hidden).map((x) => x.text.toLowerCase())
      }
    }

    // hook up link tooltips
    elem.tooltip({
      selector: '[data-link-tooltip]'
    })

    function addFilterClicked (e) {
      const filterData = $(e.currentTarget).data()
      const options = {
        datasource: panel.datasource,
        key: data.columns[filterData.column].text,
        value: data.rows[filterData.row][filterData.column],
        operator: filterData.operator
      }

      ctrl.variableSrv.setAdhocFilter(options)
    }

    elem.on('click', '.table-panel-page-link', switchPage)
    elem.on('click', '.table-panel-filter-link', addFilterClicked)

    const unbindDestroy = scope.$on('$destroy', () => {
      elem.off('click', '.table-panel-page-link')
      elem.off('click', '.table-panel-filter-link')
      unbindDestroy()
    })

    ctrl.events.on('render', (renderData) => {
      data = renderData || data
      if (data) {
        renderPanel()
      }
      ctrl.renderingCompleted()
    })
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

TableCtrl.templateUrl = 'public/plugins/libre-event-editor-table-panel/partials/module.html'
