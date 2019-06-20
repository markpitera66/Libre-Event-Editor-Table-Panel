import { appEvents } from 'app/core/core'
import { showSplitForm } from './split_event_form'
import * as utils from './utils'
import * as camApi from './camundaAPI'
import moment from 'moment'
import { enableInstantSearch } from './instant_search_ctrl'
import slider from './libs/bootstrap-slider'
import { refreshPanel } from './table_ctrl'

let categoryRes
let equipmentRes
let rowData = {}
let nextData;
let currentCategorySelected

function saveForm (data, timestamp) {
  
  const equipment = data.filter(d => d.name === 'equipment')[0].value

  const category = data.filter(d => d.name === 'category')
  
  const comment = data.filter(d => d.name === 'comment')[0].value
  
  if (!category.length > 0) {
    utils.alert('warning', 'Warning', 'Please select a category')
    return
  }
  let reasons = data.filter(d => d.name.includes('reasons-'))
  reasons = reasons.reduce((arr, r) => {
    arr.push(r.value)
    return arr
  }, [])
  const reason = reasons.join(' | ')
  const parentReason = reasons[0]

  const line = writeInfluxLine(category[0].value, parentReason, reason, comment, timestamp, equipment)
//   console.log(line);
  
  let url = utils.influxHost + 'write?db=smart_factory'
  utils.post(url, line)
    .then(res => {
    //   console.log(res)
      //save success. close the form
      $('#event-editor-form-cancelBtn').trigger('click')
      utils.alert('success', 'Success', 'form saved')
      refreshPanel()
    })
    .catch(e => {
      console.log(e)
      utils.alert('error', 'Error', `Unexpected error occurred whiling saving the form due to '${e}', please try again`)
    })
}

/**
 * Write query line to update the selected record influxdb
 */
function writeInfluxLine (category, parentReason, reason, comment, timestamp, equipment) {
  let line = 'Availability,Site=' + rowData.Site + ',Area=' + rowData.Area + ',Line=' + rowData.Line + ' '

  line += 'stopped=' + rowData.stopped + ','
  line += 'idle=' + rowData.idle + ','
  line += 'execute=' + rowData.execute + ','
  line += 'held=' + rowData.held + ','
  line += 'complete=' + rowData.complete + ','
  line += 'status="' + rowData.status + '"' + ','

  if (rowData.duration !== null && rowData.duration !== undefined) {
    line += 'duration="' + rowData.duration + '"' + ','
  }
  if (comment !== '' && comment !== undefined) {
    line += 'comment="' + comment + '"' + ','
  }
  if (equipment !== '' && equipment !== undefined) {
    line += 'equipment="' + equipment + '"' + ','
  }
  line += 'parentReason="' + parentReason + '"' + ','
  line += 'category="' + category + '"' + ','
  line += 'reason="' + reason + '"' + ' '
  line += timestamp

//   console.log(line);
  return line
}

/**
 * Send query req to influxdb and postgresql in order to show form contents.
 */
export function showForm (timestamp) {
  //console.log(timestamp)
  let influxUrl = utils.influxHost + 'query?pretty=true&db=smart_factory&q=select * from Availability where time >= ' + timestamp + ' limit 2'
  let postgresUrl = utils.postgRestHost + 'reason_codes'

  // send query requests
  utils.get(influxUrl)
    .then(handleData)
    .then(url =>
      utils.get(url)
        .then(res => {
          equipmentRes = res
        }).then(utils.get(postgresUrl)
            .then(res => {
                categoryRes = res
                popUpOptionModal(timestamp)
            })
          ).catch(e => {
            utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again')
            console.log(e)
          })
        .catch(e => {
          utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again')
          console.log(e)
        })
    )
    .catch(e => {
        utils.alert('error', 'Error', 'Unexpected error occurred whiling getting data from database, please try again')
      console.log(e)
    })

  // remove all listeners
  removeOptionListeners()
  // add listeners
  addOptionListeners(timestamp)
}

function popUpOptionModal () {
  appEvents.emit('show-modal', {
    src: 'public/plugins/smart-factory-event-editor-table-panel/partials/popup_options_form.html',
    modalClass: 'editOrMaintenance-modal',
    model: {}
  })
}

function removeOptionListeners() {
  $(document).off('click', 'input[type="radio"][name="edit-maintain-radio"]')
}

function addOptionListeners(timestamp) {

  $(document).on('click', 'input[type="radio"][name="edit-maintain-radio"]', e => {
    
    if (e.target.id === 'edit') {
      //popup editor
      popUpModal(timestamp)
      // remove all listeners
      removeListeners()
      // add listeners
      addListeners(timestamp)
    }else if (e.target.id === 'maintain') {
      //if no data, tell the user and open up the editor
      if (!rowData.category) {
        utils.alert('warning', 'Reason Codes Not Found', 'Please specify reason codes for this event before requesting maintenance')
        //popup editor
        popUpModal(timestamp)
        // remove all listeners
        removeListeners()
        // add listeners
        addListeners(timestamp)
      }else {
        //if there is data
        const processedData = processData(rowData)
        appEvents.emit('show-modal', {
          src: 'public/plugins/smart-factory-event-editor-table-panel/partials/maintenanceRequestComment.html',
          modalClass: 'confirm-modal',
          model: {}
        })
        // remove all listeners
        removeRequestListeners()
        // add listeners
        addRequestListeners(processedData)
      }
    }
  })
}

function removeRequestListeners() {
  $(document).off('click', 'button#event-editor-form-maintenance-request-sendBtn')
}

function addRequestListeners(processedData) {
  $(document).on('click', 'button#event-editor-form-maintenance-request-sendBtn', function (){
    const text = $('#edit-maintenance-request-text').val()
    processedData.requestComment = text
    camApi.postMsg(processedData)
    $('#edit-maintenance-request-comment-close-btn').trigger('click')
  })
}

function processData (rowdata) {
  const time = moment(rowdata.time).format('YYYY-MM-DD HH:mm:ss')
  const equipment = rowdata.equipment || "Unknown | Unknown"
  const reason = rowdata.reason || "Unknown"
  const comment = rowdata.comment || ""

  return {
    area: rowdata.Area,
    site: rowdata.Site,
    line: rowdata.Line,
    category: rowdata.category,
    duration: rowdata.duration.split('.')[0],
    equipment: equipment.split(' | ')[1],
    reason: reason,
    status: rowdata.status,
    eventComment: comment,
    time: time
  }
}

/**
 * Popup the event editor form modal and pass the timestamp into the html as for the form_id
 * and then show categories
 */
let retryTimes = 1
function popUpModal (timestamp) {
  appEvents.emit('show-modal', {
    src: 'public/plugins/smart-factory-event-editor-table-panel/partials/event_editor_form.html',
    modalClass: 'confirm-modal event-editor-form-modal scroll',
    model: { timestamp: timestamp }
  })

  // set timeout to make sure the DOM exist in order to append categories
  retryTimes = 1
  showCate()
}

function showCate(){
  setTimeout(() => {
    try{
      showCategories()
    }catch (e) {
      console.log(e);
      if (retryTimes > 15) {
        $('#event-editor-form-cancelBtn').trigger('click')
        utils.alert('error', 'Error', 'Editor Form init failed due to the form trying to initialise and at the same time the page being refreshing, please try agian')
      }else {
        // console.log('Editor Form init failed due to the page being refreshing, re-initialising...the ' + retryTimes + 'th time');
        showCate()
        retryTimes ++
      }
    }
  }, 200);
}

/**
 * As the modal is popped up, meaning that the html DOM is now existing. Show content dynamically based on categoryRes
 * And then add
 */
function showCategories () {
  // category is the top level, there shouldn't be reason_id and parent_reason_id
  let categories = categoryRes.filter(
    cat =>
      cat.category_id !== null &&
      cat.reason_id === null &&
      cat.parent_reason_id === null
  )
  categories = categories.reduce((arr, cat) => {
    arr.push(cat.category_id)
    return arr
  }, [])
  let categoriesGroup = $('<div class="radio-tile-group"></div>')
  categories.forEach(c => {
    categoriesGroup.append(renderCategory(c))
  })
  let target = $('div.target-being-below-categories')
  categoriesGroup.insertBefore(target)
  //console.log(categories)

  // check if category already exist, if yes, select it
  if (rowData.category !== null) {
    // check if category in categories arr
    if ($.inArray(rowData.category, categories) !== -1) {
      // inArray function returns -1 if false, !== -1 means it exists
      $('input[type=radio][name=category][value=' + '"' + rowData.category + '"' + ']').trigger('click')
    }
  }

  //display comment if there is
  if (rowData.comment !== null && rowData.comment !== undefined && rowData.comment !== '') {
    $('#editor-form-comment-area').text(rowData.comment)
  }

  //just for testing if the form can start successfully, 
  //if not, the slider.on will thorw err, then will catch it to restart the form
  let slider = $('#event-split-slider1').slider({
    min: 1,
    max: 20,
    value: 18,
  })
  slider.on('change', obj => {
  })

  if (rowData.equipment !== "" && rowData.equipment !== null && rowData.equipment !== undefined) {
    $('input#eet-datalist-input-equipment').val(rowData.equipment)
  }

  //init the datalist for equipment
  enableInstantSearch(equipmentRes)

  if (categoryRes.length === 0) {
    showEmptyMsg()
  }
}

function showEmptyMsg(){
  $('div#category-div-id').text('')
  let group = $('<p>No reason codes were found, you can add reason codes from the <strong>Reason Codes Tree Panel</strong></p>')
  let target = $('div.target-being-below-categories')
  group.insertBefore(target)
}

/**
 * Make the response row data from the influxdb into one single object for better use
 * Then use the site, area and line attr from the rowData as the keys to get make up a query url then retrun it
 */
function handleData (res) {
  let influxRes = res.results[0].series[0]
  let cols = influxRes.columns
  let vals = influxRes.values
  let data = []
  for (let o = 0; o < vals.length; o++) {
    let row = {}
    for (let i = 0; i < cols.length; i++) {
      row[cols[i]] = vals[o][i]
    }
    data.push(row)
  }
  rowData = data[0]
  nextData = data.length === 2 ? data[1] : {}
  // console.log('next record is empty ? --> ' + $.isEmptyObject(nextData))
  let equipmentUrl = utils.postgRestHost + 'equipment?production_line=eq.' + rowData.Line + '&equipment=not.is.null'
  return equipmentUrl
}

/**
 * Make up a single category box with the category passed in, and then return the box.
 */
function renderCategory (category) {
  let input_container = $('<div class="input-container categories-input-container">')
  let input = $('<input id="' + category + '" class="radio-button" type="radio" name="category" value="' + category + '" />')
  let radio_tile_group = $('<div class="radio-tile"></div>')
  let label = $('<label for="' + category + '" class="radio-tile-label">' + category + '</label>')

  radio_tile_group.append(label)
  input_container.append(input).append(radio_tile_group)

  return input_container
}

/**
 * Show the reasons
 * and then append to the DOM
 * NOTE: if is first, target var passed in is a string. else, target passed in is an object
 */
function showReasons (target, isFirstLevel) {
  let reasons
  let level
  let upperReasonsGroup

  if (isFirstLevel) {
    // is the first level
    // category = target, reasonid !== null and parentid === null
    reasons = categoryRes.filter(
      cat =>
        cat.category_id === target &&
        cat.reason_id !== null &&
        cat.parent_reason_id === null
    )
    level = 1
  } else {
    // is lower level
    // category = global_currentCategorySelected, reasonsid !== null and parentid === target.value
    reasons = categoryRes.filter(
      cat =>
        cat.category_id === currentCategorySelected &&
        cat.reason_id !== null &&
        cat.parent_reason_id === target.value
    )
    // level +1 based on the upper one
    level = parseInt(target.name.split('-')[1]) + 1
    upperReasonsGroup = target.parentElement.parentElement
  }

  reasons = reasons.reduce((arr, rea) => {
    arr.push(rea.reason_id)
    return arr
  }, [])
  //console.log(reasons)

  if (reasons.length === 0) return

  let reasonsGroup = $('<div class="switch-field"></div>')

  if (level !== 1) {
    let separator = $('<div class="custom-separator"></div>')
    reasonsGroup.append(separator)
  }

  let title = $('<div class="switch-title">Reason Level ' + level + '</div>')
  reasonsGroup.append(title)

  reasons.forEach(r => {
    reasonsGroup.append(renderReason(r, level))
  })

  if (level !== 1) {
    reasonsGroup.insertAfter(upperReasonsGroup)
  } else {
    let appendTarget = $('div.target-being-above-reason-level-1')
    reasonsGroup.insertAfter(appendTarget)
  }

  checkSelectedReasons(level, reasons)
}

/**
 * Check if there is reasons that are already selected for each level
 * If there is seleceted reason and for that level, it can be found in the config reason arr, then trigger click
 */
function checkSelectedReasons (level, config_reasons) {
  // make sure the current selected category is the same with the recorded category to avoid unwanted results
  if (currentCategorySelected === rowData.category) {
    if (rowData.reason !== null) {
      let selectedReasons = rowData.reason.split(' | ')
      if (selectedReasons[level - 1] !== null) {
        if ($.inArray(selectedReasons[level - 1], config_reasons) !== -1) {
          $(`input[type=radio][name*='reasons-'][value=` + '"' + selectedReasons[level - 1] + '"' + `]`).trigger('click')
        }
      }
    }
  }
}

/**
 * Make up a single reason option with the reason passed in, and then return the option.
 */
function renderReason (reason, level) {
  let id = level + '-' + reason
  let group = $('<div></div>')
  let input = $('<input type="radio" id="' + id + '" name="reasons-' + level + '" value="' + reason + '"/>')
  let label = $('<label for="' + id + '">' + reason + '</label>')
  group.append(input).append(label)
  return group
}

/**
 * Add listener for categories and reasons
 */
function addListeners (timestamp) {
  // categories on selected, find reasons where cate_id = this.value && parent_id === null
  $(document).on('change', 'input[type=radio][name=category]', e => {
    // console.log(e.target.value)
    currentCategorySelected = e.target.value
    // must remove all reasons before show reasons
    $('div.switch-field').remove()
    showReasons(e.target.value, true)
  })

  $(document).on('change', "input[type=radio][name*='reasons-']", e => {
    // console.log(e.target.value);

    // before show reasons, must remove all reason levels that are below this target reason level
    let reasonGroup = e.target.parentElement.parentElement
    // Remove reason level one level by one level until it return false.
    while (removeNext(reasonGroup.nextElementSibling)) {}

    showReasons(e.target, false)
  })

  $(document).on('click', 'button#event-editor-form-saveBtn', function (){
    let data = $('form#'+timestamp).serializeArray()
    if (!checkEquipment(data)){ return }
    saveForm(data, timestamp);
  })

  $(document).on('click', 'button#event-editor-form-splitBtn', function (){
    let data = $('form#'+timestamp).serializeArray()
    if (!checkEquipment(data)){ return }
    $('.event-split-form-modal').remove()
    showSplitForm(data, rowData, nextData)
  })
}

function checkEquipment(data) {
  const equipment = data.filter(d => d.name === 'equipment')[0].value
    //check for equipment input

  if (!isEquipmentValid(equipment)) { 
    //equipment can be empty but if it's not empty it must be the same with the original one to ensure consistency
    if (equipment !== "") { 
      utils.alert('warning', 'Warning', 'Equipment not found, please select it from the list or leave it empty')
      return false
    }
  }

  return true
}

function isEquipmentValid(equipment) {
  
  const equip = equipmentRes.reduce((arr, e) => {
    const text = e.production_line + ' | ' + e.equipment    
    arr.push(text)
    return arr
  }, [])
  if (equip.indexOf(equipment) === -1) {
    return false
  }
  return true
}

function removeListeners () {
  $(document).off('change', 'input[type=radio][name=category]')
  $(document).off('change', "input[type=radio][name*='reasons-']")
  $(document).off('click', 'button#event-editor-form-saveBtn')
  $(document).off('click', 'button#event-editor-form-splitBtn')
}

/**
 * Remove Div named 'switch-field', which is one level of reasons
 */
function removeNext (next) {
  if (next.className === 'switch-field') {
    next.remove()
    return true
  } else {
    return false
  }
}