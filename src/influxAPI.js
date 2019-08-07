import * as utils from './utils'

export const insert = async (measurement, current, data) => {
  const line = writeLine(measurement, current, data)
  const url = `${utils.influxHost}write?db=smart_factory`
  const result = await utils.sure(utils.post(url, line))
  return result
}

export const split = async (newTimeStamp, currentEvent, form, measurement) => {
  const oldTimeStamp = form.min * 1000000
  const maxTimeStamp = form.max * 1000000

  const lineForLeft = writeSplitLine(oldTimeStamp, newTimeStamp, maxTimeStamp, currentEvent.record, form, measurement, true)
  const lineForRight = writeSplitLine(oldTimeStamp, newTimeStamp, maxTimeStamp, currentEvent.record, form, measurement, false)

  const url = `${utils.influxHost}write?db=${utils.influxDBName}`

  const leftResult = await utils.sure(utils.post(url, lineForLeft)) 
  if (!leftResult.ok) { return leftResult }
  const rightResult = await utils.sure(utils.post(url, lineForRight))
  if (!rightResult.ok) { return rightResult }

  return rightResult
}

const writeLine = (measurement, current, data) => {
  const cur = current.record
  const timestamp = current.timestamp

  let line = `${measurement},Site=${utils.addSlash(cur.site)},Area=${utils.addSlash(cur.area)},Line=${utils.addSlash(cur.line)} `

  if(isOK(cur.stopped)){ line += `stopped=${cur.stopped},` }
  if(isOK(cur.idle)){ line += `idle=${cur.idle},` }
  if(isOK(cur.execute)){ line += `execute=${cur.execute},` }
  if(isOK(cur.held)){ line += `held=${cur.held},` }
  if(isOK(cur.complete)){ line += `complete=${cur.complete},` }

  if(isOK(cur.status)){ line += `status="${cur.status}",` }
  if(isOK(cur.machinestate)){ line += `MachineState="${cur.machinestate}",` }

  if(isOK(cur.actual_rate)){ line += `actual_rate=${cur.actual_rate},` }

  if(isOK(cur.rid_1)){ line += `rid_1="${cur.rid_1}",` }

  if(isOK(cur.duration)){ line += `duration="${cur.duration}",` }


  line += isOK(data.comment) ? `comment="${data.comment}",` : `comment="",` 
  line += isOK(data.equipment) ? `equipment="${data.equipment}",` : `equipment="",` 

  if(data.reasons.length !== 0){ 
    line += `parentReason="${data.reasons[0]}",` 
    line += `reason="${data.reasons.join(' | ')}",` 
  }
  line += `category="${data.category}" `
  line += timestamp

  return line
}

const writeSplitLine = (oldTimeStamp, newTimeStamp, maxTimeStamp, cur, form, measurement, isLeftLine) => {
  let line = `${measurement},Site=${utils.addSlash(cur.site)},Area=${utils.addSlash(cur.area)},Line=${utils.addSlash(cur.line)} `
  if(isOK(cur.stopped)){ line += `stopped=${cur.stopped},` }
  if(isOK(cur.idle)){ line += `idle=${cur.idle},` }
  if(isOK(cur.execute)){ line += `execute=${cur.execute},` }
  if(isOK(cur.held)){ line += `held=${cur.held},` }
  if(isOK(cur.complete)){ line += `complete=${cur.complete},` }
  if(isOK(cur.status)){ line += `status="${cur.status}",` }
  if(isOK(cur.machinestate)){ line += `MachineState="${cur.machinestate}",` }
  if(isOK(cur.actual_rate)){ line += `actual_rate=${cur.actual_rate},` }
  if(isOK(cur.rid_1)){ line += `rid_1="${cur.rid_1}",` }
  
  if (isLeftLine) {
    // writing left line
    if (form.meta.isSplittingLeft) {
      // is splitting left
      line += isOK(form.comment) ? `comment="${form.comment}",` : `comment="",` 
      line += isOK(form.equipment) ? `equipment="${form.equipment}",` : `equipment="",` 
      if(isOK(form.category)){ line += `category="${form.category}",` }
      if(isOK(form.reasons)){ 
        line += `parentReason="${form.reasons.split(' | ')[0]}",` 
        line += `reason="${form.reasons}",` 
      }
    }else {
      // is splitting right
      if(isOK(cur.comment)){ line += `comment="${cur.comment}",` }
      if(isOK(cur.equipment)){ line += `equipment="${cur.equipment}",` }
      if(isOK(cur.category)){ line += `category="${cur.category}",` }
      if(isOK(cur.parentreason)){ line += `parentReason="${cur.parentreason}",` }
      if(isOK(cur.reason)){ line += `reason="${cur.reason}",` }
    }

    const diff = newTimeStamp - oldTimeStamp 
    const dur = getDuration(diff)
    line += `durationInt=${diff/1000000},`
    line += `duration="${dur}" ` // it's the last field in the query, leave a space for the timestamp
    line += oldTimeStamp

  } else {
    // write right line
    if (!form.meta.isSplittingLeft) {
      // is splitting right
      line += isOK(form.comment) ? `comment="${form.comment}",` : `comment="",` 
      line += isOK(form.equipment) ? `equipment="${form.equipment}",` : `equipment="",` 
      if(isOK(form.category)){ line += `category="${form.category}",` }
      if(isOK(form.reasons)){ 
        line += `parentReason="${form.reasons.split(' | ')[0]}",` 
        line += `reason="${form.reasons}",` 
      }
    }

    const diff = maxTimeStamp - newTimeStamp 
    const dur = getDuration(diff)
    line += `durationInt=${diff/1000000},`
    line += `duration="${dur}" ` // it's the last field in the query, leave a space for the timestamp
    line += newTimeStamp
  }

  return line
}

function isOK(val) {
  return val !== null && val !== undefined && val !== '' && val !== 'No Category' && val !== 'No Reasons'
}

function getDuration(diff){

  let difference = diff/1000000
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