'use strict';

System.register(['app/core/core'], function (_export, _context) {
  "use strict";

  var appEvents, hostname, http, postgRestHost, influxHost, influxDBName, tasklistHostName, camundaHost, camundaRestApi, get, post, addSlash, alert, showModal, isValidVal, sure, copy;
  return {
    setters: [function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }],
    execute: function () {
      hostname = window.location.hostname;
      http = "http://";

      _export('postgRestHost', postgRestHost = http + hostname + ':5436/');

      _export('postgRestHost', postgRestHost);

      _export('influxHost', influxHost = http + hostname + ':8086/');

      _export('influxHost', influxHost);

      _export('influxDBName', influxDBName = 'smart_factory');

      _export('influxDBName', influxDBName);

      tasklistHostName = hostname;

      if (tasklistHostName === 'localhost') {
        tasklistHostName = '127.0.0.1';
      }

      _export('camundaHost', camundaHost = http + tasklistHostName + ':8080/camunda/app/tasklist');

      _export('camundaHost', camundaHost);

      _export('camundaRestApi', camundaRestApi = http + hostname + ':8080/engine-rest/');

      _export('camundaRestApi', camundaRestApi);

      _export('get', get = function get(url) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url);
          xhr.onreadystatechange = handleResponse;
          xhr.onerror = function (e) {
            return reject(e);
          };
          xhr.send();

          function handleResponse() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                var res = JSON.parse(xhr.responseText);
                resolve(res);
              } else {
                reject(this.statusText);
              }
            }
          }
        });
      });

      _export('get', get);

      _export('post', post = function post(url, line) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', url);
          xhr.onreadystatechange = handleResponse;
          xhr.onerror = function (e) {
            return reject(e);
          };
          xhr.send(line);

          function handleResponse() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                // console.log('200');
                var res = JSON.parse(xhr.responseText);
                resolve(res);
              } else if (xhr.status === 204) {
                // console.log('204');
                res = xhr.responseText;
                resolve(res);
              } else {
                reject(this.statusText);
              }
            }
          }
        });
      });

      _export('post', post);

      _export('addSlash', addSlash = function addSlash(target) {
        return target.split(' ').join('\\ ');
      });

      _export('addSlash', addSlash);

      _export('alert', alert = function alert(type, title, msg) {
        appEvents.emit('alert-' + type, [title, msg]);
      });

      _export('alert', alert);

      _export('showModal', showModal = function showModal(html, data, mClass) {
        appEvents.emit('show-modal', {
          src: 'public/plugins/smart-factory-event-editor-table-panel/partials/' + html,
          modalClass: mClass || 'confirm-modal',
          model: data
        });
      });

      _export('showModal', showModal);

      _export('isValidVal', isValidVal = function isValidVal(val) {
        return val !== null && val !== undefined && val !== '';
      });

      _export('isValidVal', isValidVal);

      _export('sure', sure = function sure(promise) {
        return promise.then(function (data) {
          return { ok: true, data: data };
        }).catch(function (error) {
          return Promise.resolve({ ok: false, error: error });
        });
      });

      _export('sure', sure);

      _export('copy', copy = function copy(obj) {
        return JSON.parse(JSON.stringify(obj));
      });

      _export('copy', copy);
    }
  };
});
//# sourceMappingURL=utils.js.map
