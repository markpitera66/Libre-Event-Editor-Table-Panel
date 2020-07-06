import * as utils from './utils'
import * as instant from './instant_search_ctrl'
import * as influx from './influxAPI'
import { SplitEventCtrl } from './split_event_form'

export class EditEventCtrl {
  /** @ngInject */
  constructor (ctrl) {
    this.init(ctrl)
    this.prepare()
  }

  show () {
    utils.showModal('event_editor_form.html', this, 'confirm-modal event-editor-form-modal scroll')
  }

  init (ctrl) {
    this.panelCtrl = ctrl.panelCtrl
    this.currentEvent = ctrl.currentEvent
    this.equipment = ctrl.equipment
    this.reasonCodes = ctrl.reasonCodes
    this.reasonCodes.currentReasons = []
    this.editForm = {
      category: this.currentEvent.record.category,
      reasons: [],
      equipment: null,
      comment: this.currentEvent.record.comment,
      saveBtnMsg: 'Save',
      meta: {
        isSaving: false
      }
    }

    // if record's equipment can be found in the posrgres equipment list
    if (this.equipment.datalist.map((x) => x.text).indexOf(this.currentEvent.record.equipment) !== -1) {
      this.editForm.equipment = this.currentEvent.record.equipment
    }
  }

  prepare () {
    const record = this.currentEvent.record
    // if there is category but not reason
    if (utils.isValidVal(record.category)) {
      this.reasonCodes.currentReasons.push(this.findReasonsByCategory(record.category))
      // if there is reasons
      if (utils.isValidVal(record.reason)) {
        this.editForm.reasons = record.reason.split(' | ')
        const reasons = this.editForm.reasons
        for (let i = 0; i < reasons.length; i++) {
          const reason = reasons[i]
          const children = this.findChildrenByReason(reason)
          if (children.length !== 0) {
            this.reasonCodes.currentReasons.push(children)
          }
        }
      }
    }
  }

  dataSearch () {
    instant.enableInstantSearch(
      this.equipment.datalist,
      'eet-datalist-equipment',
      'eet-datalist-input-equipment',
      'eet-datalist-ul-equipment'
    )
  }

  onDataSearchChange (event) {
    this.editForm.equipment = event.target.innerHTML
  }

  onReasonSelect (key, index) {
    const length = this.reasonCodes.currentReasons.length
    const newChildren = this.findChildrenByReason(key)
    this.reasonCodes.currentReasons.splice(index + 1, length - (index + 1), newChildren)
    if (newChildren.length === 0) this.reasonCodes.currentReasons.pop()
    this.editForm.reasons.length = index + 1
  }

  onCategorySelect (key) {
    this.reasonCodes.currentReasons = []
    this.editForm.reasons = []
    this.reasonCodes.currentReasons.push(this.findReasonsByCategory(key))
  }

  async onSave () {
    if (!this.panelCtrl.panel.measurementOK) {
      utils.alert(
        'warning',
        'Warning',
        "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query"
      )
      return
    }

    if (!this.editForm.category) {
      utils.alert('warning', 'Warning', 'Please select a category')
      return
    }

    if (utils.isValidVal(this.editForm.equipment)) {
      if (this.equipment.datalist.map((x) => x.text).indexOf(this.editForm.equipment) === -1) {
        utils.alert(
          'warning',
          'Warning',
          `Cannot find equipment "${this.editForm.equipment}" in the database, please choose it from the list or just leave it empty`
        )
        return
      }
    }

    this.enableSaving()

    const measurement = this.panelCtrl.panel.endPoint
    const result = await influx.insert(measurement, this.currentEvent, this.editForm)

    if (result.ok) {
      utils.alert('success', 'Successful', 'The event has been successfully updated')
      this.closeForm()
      this.panelCtrl.refresh()
    } else {
      utils.alert(
        'error',
        'Error',
        `Unexpected error occurred when updating this event due to ${result.error}, please try again or contact the dev team`
      )
      this.closeForm()
      console.log(result.error)
    }
  }

  onSplit () {
    // check equipment
    if (utils.isValidVal(this.editForm.equipment)) {
      if (this.equipment.datalist.map((x) => x.text).indexOf(this.editForm.equipment) === -1) {
        utils.alert(
          'warning',
          'Warning',
          `Cannot find equipment "${this.editForm.equipment}" in the database, please choose it from the list or just leave it empty`
        )
        return
      }
    }

    const splitForm = new SplitEventCtrl(this)
    splitForm.show()
  }

  findReasonsByCategory (key) {
    return this.reasonCodes.reasons.filter((x) => x.category === key).map((x) => x.reason)
  }

  findChildrenByReason (key) {
    const category = this.editForm.category
    return this.reasonCodes.parentChildren
      .filter((x) => x.category === category && x.parent === key)
      .map((x) => x.child)
  }

  enableSaving () {
    this.editForm.meta.isSaving = true
    this.editForm.saveBtnMsg = 'Saving... '
  }

  disableSaving () {
    this.editForm.meta.isSaving = false
    this.editForm.saveBtnMsg = 'Save'
  }

  closeForm () {
    this.disableSaving()
    setTimeout(() => {
      document.querySelector('#eetp-edit-form-closeBtn').click()
    }, 0)
  }
}
