import * as utils from './utils'

const post = (url, param, json) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    xhr.open('POST', url + param)
    xhr.onreadystatechange = handleResponse
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onerror = e => reject(e)
    xhr.send(json)

    function handleResponse () {
      if (xhr.readyState === 4) {
        if (xhr.status < 300 && xhr.status >= 200) {
          resolve(xhr.responseText)
        } else {
          reject(xhr.responseText)
        }
      }
    }
  })
}

export const postMsg = data => {
  const line = data.site + ' | ' + data.area + ' | ' + data.line
  const toSend = {
    messageName : "maintenanceRequest",
    processVariables : {
      _requestContext : {value: JSON.stringify(data), type: 'String'},
      _currentLine : {value: line, type: 'String'}
    }
  }

  post(utils.camundaRestApi, 'message', JSON.stringify(toSend)).then(res => {
    utils.alert('success', 'Successful', 'Maintenance request has been successfully sent')
  }).catch(e => {
    utils.alert('error', 'Error', "Maintenance request hasn't been sent due to '" + e + "', please try agian")
  })
}