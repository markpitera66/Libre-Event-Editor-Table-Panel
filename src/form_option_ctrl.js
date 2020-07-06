import * as utils from './utils'
import { EditEventCtrl } from './edit_event_ctrl'
import { MaintenanceCtrl } from './maintenance_ctrl'

export class FormOptionCtrl {
  /** @ngInject */
  constructor (ctrl, timestamp) {
    this.panelCtrl = ctrl
    this.currentEvent = { timestamp }
    this.allEvents = ctrl.allData
    this.equipment = { data: null, datalist: null }
    this.reasonCodes = { data: null, categories: null, reasons: null, parentChildren: null }
  }

  async show () {
    const hasQueryData = await this.hasQueryData()
    if (!hasQueryData) {
      return
    }
    new EditEventCtrl(this).show()
  }

  async hasQueryData () {
    const measurement = this.panelCtrl.panel.endPoint
    const timestamp = this.currentEvent.timestamp
    console.log(timestamp)
    const influxUrl = utils.influxHost + `query?pretty=true&db=smart_factory&q=select * from ${measurement} where time = ${timestamp}`
    const measurementResult = await utils.sure(utils.get(influxUrl))
    console.log(measurementResult)
    if (!this.isResultOK(measurementResult, `influxdb - ${measurement}`)) {
      return false
    }
    if (!this.isMeasureDataOK(measurementResult, `influxdb - ${measurement}`)) {
      return false
    }
    this.parseData(measurementResult) // make results more structured, and store into cur and next

    try {
      this.currentEvent.record = this.findCurrentEvent(this.currentEvent)
    } catch (e) {
      console.log('e', e)
      return false
    }

    const equipmentEndPoint = this.panelCtrl.panel.equipmentEndPoint
    const equipmentUrl = utils.postgRestHost + `${equipmentEndPoint}?production_line=eq.${this.currentEvent.record.line}&equipment=not.is.null`
    const equipmentResult = await utils.sure(utils.get(equipmentUrl))
    if (!this.isResultOK(equipmentResult, `postgresDB - ${equipmentEndPoint}`)) {
      return false
    }
    this.equipment.data = equipmentResult.data
    this.equipment.datalist = this.equipment.data.reduce((arr, equip) => {
      const obj = { value: equip, text: equip.production_line + ' | ' + equip.equipment }
      arr.push(obj)
      return arr
    }, [])

    const reasonCodeEndPoint = this.panelCtrl.panel.reasonCodeEndPoint
    const reasonCodeUrl = utils.postgRestHost + reasonCodeEndPoint
    const resonCodeResult = await utils.sure(utils.get(reasonCodeUrl))
    if (!this.isResultOK(resonCodeResult, `postgresDB - ${reasonCodeEndPoint}`)) {
      return false
    }
    this.parseReasonCodes(resonCodeResult.data)

    return true
  }

  parseReasonCodes (data) {
    this.reasonCodes.data = data
    const allCategories = data.map((x) => x.category_id)
    const categories = Array.from(new Set(allCategories))
    this.reasonCodes.categories = categories
    this.reasonCodes.reasons = data.filter((x) => x.reason_id && !x.parent_reason_id).map((x) => {
      return {
        category: x.category_id,
        reason: x.reason_id
      }
    })
    this.reasonCodes.parentChildren = data.filter((x) => x.parent_reason_id).map((x) => {
      return {
        category: x.category_id,
        parent: x.parent_reason_id,
        child: x.reason_id
      }
    })
  }

  parseData (res) {
    const series = res.data.results[0].series[0]
    const cols = series.columns.map((x) => x.toLowerCase())
    const rows = series.values
    const data = []
    for (let i = 0; i < rows.length; i++) {
      const row = {}
      for (let k = 0; k < cols.length; k++) {
        row[cols[k]] = rows[i][k]
      }
      data.push(row)
    }

    this.currentEvent.record = data[0]
  }

  findCurrentEvent (current) {
    const res = this.allEvents.filter((x) => x.time === Math.round(current.timestamp / 1000000))
    return res[0]
  }

  isResultOK (result, source) {
    if (!result.ok) {
      utils.alert(
        'error',
        'Error',
        `Unexpected error occurred whiling getting data from ${source}, please try again`
      )
      console.log(result.error)
      return false
    } else {
      return true
    }
  }

  isMeasureDataOK (result, source) {
    if (!result.data.results[0].series) {
      utils.alert(
        'error',
        'Error',
        `${source} is OK but returns EMPTY result, please make sure the data config measurement matches the one you put in the query and try again`
      )
      return false
    }
    return true
  }

  onEditClick () {
    new EditEventCtrl(this).show()
  }

  onMaintainClick () {
    if (utils.isValidVal(this.currentEvent.record.category)) {
      new MaintenanceCtrl(this).show()
    } else {
      utils.alert('error', 'Warning', 'Requesting maintenance requires the Event Category to be specified')
      new EditEventCtrl(this).show()
    }
  }
}
