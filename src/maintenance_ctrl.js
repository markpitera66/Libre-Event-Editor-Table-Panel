import * as utils from './utils'
import moment from 'moment'
import * as camunda from './camundaAPI'

export class MaintenanceCtrl {
  /** @ngInject */
  constructor(ctrl) {
    this.init(ctrl)
    this.prepare()
  } 

  init(ctrl) {
    this.currentEvent = ctrl.currentEvent.record
    this.form = {
      requestComment: '',
      category: this.currentEvent.category,
      duration: this.currentEvent.duration,
      line: this.currentEvent.line,
      area: this.currentEvent.area,
      site: this.currentEvent.site,
      meta: {
        isSending: false
      },
      sendBtnMsg: 'Send'
    }
  }

  prepare() {
    this.form.lineCombined = [this.currentEvent.site, this.currentEvent.area, this.currentEvent.line].join(' | ')
    this.form.equipment = this.currentEvent.equipment || 'Unknown'
    this.form.equipment = this.form.equipment.split(' | ')[1] || this.form.equipment.split(' | ')[0]
    this.form.reason = this.currentEvent.reason || 'Unknown'
    if(!this.currentEvent.status) {
      this.form.status = this.currentEvent.machinestate || 'Unknown'
    } else {
      this.form.status = this.currentEvent.status
    }
    this.form.time = moment(this.currentEvent.time).format('YYYY-MM-DD HH:mm:ss')
    this.form.eventComment = this.currentEvent.comment || ''
  }

  show() {
    utils.showModal('maintenanceRequestComment.html', this)
  }

  async onSend() {

    this.enableSending()
    
    const result = await camunda.postMsg(this.form)
    
    if (result.ok) {
      utils.alert('success', 'Successful', `The event has been successfully splitted`)
      this.closeForm()
    } else {
      utils.alert('error', 'Error', `Unexpected error occurred when sending the maintenance request due to ${result.error}, please try again or contact the dev team`)
      this.closeForm()
      console.log(result.error)
    }

  }

  process() {
    return {

    }
  }

  closeForm() {
    this.disableSending()
    setTimeout(() => {
      document.querySelector('#edit-maintenance-request-comment-close-btn').click()
    }, 0);
  }

  enableSending() {
    this.form.meta.isSending = true
    this.form.sendBtnMsg = 'Sending... '
  }

  disableSending() {
    this.form.meta.isSending = false
    this.form.sendBtnMsg = 'Send'
  }

}