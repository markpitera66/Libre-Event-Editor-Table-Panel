'use strict';

System.register(['./utils'], function (_export, _context) {
  "use strict";

  var utils, post, postMsg;
  return {
    setters: [function (_utils) {
      utils = _utils;
    }],
    execute: function () {
      post = function post(url, param, json) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', url + param);
          xhr.onreadystatechange = handleResponse;
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.onerror = function (e) {
            return reject(e);
          };
          xhr.send(json);

          function handleResponse() {
            if (xhr.readyState === 4) {
              if (xhr.status < 300 && xhr.status >= 200) {
                resolve(xhr.responseText);
              } else {
                reject(xhr.responseText);
              }
            }
          }
        });
      };

      _export('postMsg', postMsg = async function postMsg(data) {

        var line = data.site + ' | ' + data.area + ' | ' + data.line;
        var toSend = {
          messageName: "maintenanceRequest",
          processVariables: {
            _requestContext: { value: JSON.stringify(data), type: 'String' },
            _currentLine: { value: line, type: 'String' }
          }
        };

        return await utils.sure(post(utils.camundaRestApi, 'message', JSON.stringify(toSend)));
      });

      _export('postMsg', postMsg);
    }
  };
});
//# sourceMappingURL=camundaAPI.js.map
