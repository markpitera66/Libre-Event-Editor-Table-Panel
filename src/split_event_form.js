import * as utils from './utils'
import * as influx from './influxAPI'
import moment from 'moment'
import slider from './libs/bootstrap-slider'

export class SplitEventCtrl {
  /** @ngInject */
  constructor (ctrl) {
    this.init(ctrl)
    this.prepare()
  }

  init (ctrl) {
    this.panelCtrl = ctrl.panelCtrl
    this.currentEvent = ctrl.currentEvent
    this.editForm = ctrl.editForm
    this.splitForm = {
      meta: {
        isSplittingLeft: true,
        isEditing: false,
        isSaving: false,
        tempVal: null
      },
      saveBtnMsg: 'Save'
    }
  }

  prepare () {
    this.splitForm.min = new Date(this.currentEvent.record.time).getTime()
    this.splitForm.max = moment(this.splitForm.min).add(this.currentEvent.record.duration).valueOf()
    this.splitForm.value = this.splitForm.min + (this.splitForm.max - this.splitForm.min) / 2
    this.splitForm.splitInput = this.getDateTime(this.splitForm.value)
    this.splitForm.targetTime = this.getDateTime(this.splitForm.min)
    this.splitForm.nextTime = this.getDateTime(this.splitForm.max)
    this.splitForm.category = utils.isValidVal(this.editForm.category) ? this.editForm.category : 'No Category'
    this.splitForm.reasons = this.editForm.reasons.length !== 0 ? this.editForm.reasons.join(' | ') : 'No Reasons'
    this.splitForm.cateReaText =
      this.splitForm.category === 'No Category' ? 'No Category' : `${this.splitForm.category} - ${this.splitForm.reasons}`
    this.splitForm.equipment = this.editForm.equipment
    this.splitForm.comment = this.editForm.comment
  }

  show () {
    utils.showModal('split_event_form.html', this, 'confirm-modal event-split-form-modal')
  }

  enableSlider () {
    const slider = $('#event-editor-table-split-slider').slider({
      min: this.splitForm.min,
      max: this.splitForm.max,
      value: this.splitForm.value,
      step: 1,
      tooltip: 'hide',
      formatter: (val) => {
        return this.getDateTime(val)
      }
    })

    $('#ex1Slider .slider-selection').css('background', '#4cd964')

    slider.on('change', (obj) => {
      const newVal = obj.value.newValue
      const result = this.getDateTime(newVal)
      this.splitForm.splitInput = result
      $('#event-split-input').val(result)
    })
  }

  onSplitChange (event) {
    const id = event.target.id
    if (id === 'left') {
      this.splitLeft()
    } else {
      this.splitRight()
    }
  }

  onTopBoxSave () {
    const temp = this.splitForm.meta.tempVal
    const val = this.splitForm.splitInput

    const dateTime = new Date(val).getTime()
    if (isNaN(dateTime)) {
      this.splitForm.splitInput = temp
      utils.alert(
        'warning',
        'Warning',
        'The date time entered is not in a correct format, please follow the original format'
      )
    } else {
      if (val.length < 19) {
        this.splitForm.splitInput = temp
        utils.alert('warning', 'Warning', 'Please at least provide precision of seconds')
      } else if (val.length > 23) {
        this.splitForm.splitInput = temp
        utils.alert('warning', 'Warning', 'Precision can only be up to milliseconds')
      } else {
        if (dateTime < this.splitForm.min || dateTime > this.splitForm.max) {
          this.splitForm.splitInput = temp
          utils.alert('warning', 'Warning', 'The date time entered is out of range')
        } else {
          // OK
          this.splitForm.meta.isEditing = false
          $('#event-editor-table-split-slider').slider('setValue', parseInt(dateTime))
        }
      }
    }
  }

  onTopBoxCancel () {
    this.splitForm.splitInput = this.splitForm.meta.tempVal
    this.splitForm.meta.isEditing = false
  }

  async onFormSave () {
    if (!this.panelCtrl.panel.measurementOK) {
      utils.alert(
        'warning',
        'Warning',
        "The measurement you put in the Down Time Panel may be invalid, please make sure it matches the one that's in the query"
      )
      return
    }

    this.enableSaving()

    const newTimestamp = $('#event-editor-table-split-slider').slider('getValue') * 1000000
    const result = await influx.split(
      newTimestamp,
      this.currentEvent,
      this.splitForm,
      this.panelCtrl.panel.endPoint
    )

    if (result.ok) {
      utils.alert('success', 'Successful', 'The event has been successfully splitted')
      this.closeForm()
      this.panelCtrl.refresh()
    } else {
      utils.alert(
        'error',
        'Error',
        `Unexpected error occurred when splitting this event due to ${result.error}, please try agian or contact the dev team`
      )
      this.closeForm()
      console.log(result.error)
    }
  }

  splitLeft () {
    this.splitForm.meta.isSplittingLeft = true
    $('#ex1Slider .slider-selection').css('background', '#4cd964')
    $('#ex1Slider .slider-track-high').css('background', '')
  }

  splitRight () {
    this.splitForm.meta.isSplittingLeft = false
    $('#ex1Slider .slider-selection').css('background', '')
    $('#ex1Slider .slider-track-high').css('background', '#eb972a')
  }

  closeForm () {
    this.disableSaving()
    setTimeout(() => {
      document.querySelector('#eetp-split-form-closeBtn').click()
    }, 0)
  }

  enableSaving () {
    this.splitForm.meta.isSaving = true
    this.splitForm.saveBtnMsg = 'Saving... '
  }

  disableSaving () {
    this.splitForm.meta.isSaving = false
    this.splitForm.saveBtnMsg = 'Save'
  }

  getDateTime (timestamp) {
    const monthDate = ('0' + new Date(timestamp).getDate()).slice(-2)
    const month = ('0' + (new Date(timestamp).getMonth() + 1)).slice(-2)
    const year = new Date(timestamp).getFullYear()
    const date = year + '-' + month + '-' + monthDate

    const hrs = ('0' + new Date(timestamp).getHours()).slice(-2)
    const mins = ('0' + new Date(timestamp).getMinutes()).slice(-2)
    const seconds = ('0' + new Date(timestamp).getSeconds()).slice(-2)
    const milSec = new Date(timestamp).getMilliseconds()
    const time = hrs + ':' + mins + ':' + seconds + '.' + milSec

    const dateTime = date + ' ' + time
    return dateTime
  }
}
