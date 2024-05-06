/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import browser from 'webextension-polyfill'
import { calculateFrameIndex } from './utils'

let contentSideexTabId = -1
let frameLocation = ''
let recordingIndicator

function Recorder(window) {
  this.window = window
  this.eventListeners = {}
  this.attached = false
  this.recordingState = {}
}

Recorder.eventHandlers = {}
Recorder.mutationObservers = {}
Recorder.addEventHandler = function (handlerName, eventName, handler, options) {
  handler.handlerName = handlerName
  if (!options) options = false
  let key = options ? 'C_' + eventName : eventName
  if (!this.eventHandlers[key]) {
    this.eventHandlers[key] = []
  }
  this.eventHandlers[key].push(handler)
}

Recorder.addMutationObserver = function (observerName, callback, config) {
  const observer = new MutationObserver(callback)
  observer.observerName = observerName
  observer.config = config
  this.mutationObservers[observerName] = observer
}

Recorder.prototype.parseEventKey = function (eventKey) {
  if (eventKey.match(/^C_/)) {
    return { eventName: eventKey.substring(2), capture: true }
  } else {
    return { eventName: eventKey, capture: false }
  }
}

function updateInputElementsOfRelevantType(action) {
  let inp = window.document.getElementsByTagName('input')
  for (let i = 0; i < inp.length; i++) {
    if (Recorder.inputTypes.indexOf(inp[i].type) >= 0) {
      action(inp[i])
    }
  }
}

function focusEvent(recordingState, event) {
  recordingState.focusTarget = event.target
  recordingState.focusValue = recordingState.focusTarget.value
  recordingState.tempValue = recordingState.focusValue
  recordingState.preventType = false
}

function blurEvent(recordingState) {
  recordingState.focusTarget = null
  recordingState.focusValue = null
  recordingState.tempValue = null
}

function attachInputListeners(recordingState) {
  updateInputElementsOfRelevantType(input => {
    input.addEventListener('focus', focusEvent.bind(null, recordingState))
    input.addEventListener('blur', blurEvent.bind(null, recordingState))
  })
}

function detachInputListeners(recordingState) {
  updateInputElementsOfRelevantType(input => {
    input.removeEventListener('focus', focusEvent.bind(null, recordingState))
    input.removeEventListener('blur', blurEvent.bind(null, recordingState))
  })
}

Recorder.prototype.attach = function () {
  if (!this.attached) {
    for (let eventKey in Recorder.eventHandlers) {
      const eventInfo = this.parseEventKey(eventKey)
      const eventName = eventInfo.eventName
      const capture = eventInfo.capture

      const handlers = Recorder.eventHandlers[eventKey]
      this.eventListeners[eventKey] = []
      for (let i = 0; i < handlers.length; i++) {
        let handlername = handlers[i].handlerName
        if (handlername.includes("adow")) { continue; }
        let handler = handlers[i].bind(this)
        this.window.document.addEventListener(eventName, handler, capture)
        this.eventListeners[eventKey].push(handler)
      }
    }
    for (let observerName in Recorder.mutationObservers) {
      const observer = Recorder.mutationObservers[observerName]
      observer.observe(this.window.document.body, observer.config)
    }

    // Traverse through all elements in the document
    const traverseElements = (element) => {
      // Attach event listeners for shadow DOM elements
      for (let eventKey in Recorder.eventHandlers) {
        const eventInfo = this.parseEventKey(eventKey)
        const eventName = eventInfo.eventName
        const capture = eventInfo.capture

        const handlers = Recorder.eventHandlers[eventKey]
        if (element.shadowRoot) {
          const shadowRoot = element.shadowRoot;
          this.eventListeners[eventKey] = this.eventListeners[eventKey] || [];
          for (let i = 0; i < handlers.length; i++) {
            let handlername = handlers[i].handlerName
            // console.log(`while traversing found a shadow to event: ${JSON.stringify(element)}, ${handlername}`)
            if (handlername.includes("adow")) {
              let handler = (event) => {
                return handlers[i].bind(this)(event); // Bind and call the original function
              };
              shadowRoot.addEventListener(eventName, handler, capture);
              // console.log(`handler added ${handlername}, ${element.id}`)
              this.eventListeners[eventKey].push(handler);
            }
          }
        }
      }

      // Attach mutation observers for shadow DOM elements
      for (let observerName in Recorder.mutationObservers) {
        const observer = Recorder.mutationObservers[observerName];
        if (element.shadowRoot) {
          // console.log(`while traversing found a shadow to observe: ${JSON.stringify(element)}`)
          observer.observe(element.shadowRoot, observer.config);
        }
      }

      if (element.shadowRoot) {
        console.log(`current node traversing shadow: ${element.shadowRoot.id}`)
        element.shadowRoot.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            console.log(`current node traversing shadow child: ${child.id}`)
            traverseElements(child);
          }
        });

      } else {
        console.log(`current node traversing normal: ${element.id}`)
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
             console.log(`current node traversing child: ${child.id}, ${child}`)
            traverseElements(child);
          }
        });
      }  
    };

    traverseElements(this.window.document.body);

    this.attached = true
    this.recordingState = {
      typeTarget: undefined,
      typeLock: 0,
      focusTarget: null,
      focusValue: null,
      tempValue: null,
      preventType: false,
      preventClickTwice: false,
      preventClick: false,
      enterTarget: null,
      enterValue: null,
      tabCheck: null,
    }
    attachInputListeners(this.recordingState)
    addRecordingIndicator()
  }
}

Recorder.prototype.detach = function () {
  for (let eventKey in this.eventListeners) {
    const eventInfo = this.parseEventKey(eventKey)
    const eventName = eventInfo.eventName
    const capture = eventInfo.capture
    for (let i = 0; i < this.eventListeners[eventKey].length; i++) {
      this.window.document.removeEventListener(
        eventName,
        this.eventListeners[eventKey][i],
        capture
      )
    }
  }
  for (let observerName in Recorder.mutationObservers) {
    const observer = Recorder.mutationObservers[observerName]
    observer.disconnect()
  }
  this.eventListeners = {}
  this.attached = false
  removeRecordingIndicator()
  detachInputListeners(this.recordingState)
}

function attachRecorderHandler(message, _sender, sendResponse) {
  if (message.attachRecorder) {
    recorder.attach()
    sendResponse(true)
  }
}

function detachRecorderHandler(message, _sender, sendResponse) {
  if (message.detachRecorder) {
    recorder.detach()
    sendResponse(true)
  }
}

const recorder = new Recorder(window)

// recorder event handlers
browser.runtime.onMessage.addListener(attachRecorderHandler)
browser.runtime.onMessage.addListener(detachRecorderHandler)

function addRecordingIndicator() {
  if (frameLocation === 'root' && !recordingIndicator) {
    const indicatorIndex = window.parent.frames.length
    recordingIndicator = window.document.createElement('iframe')
    recordingIndicator.src = browser.runtime.getURL('/indicator.html')
    recordingIndicator.id = 'selenium-ide-indicator'
    recordingIndicator.style.border = '1px solid #d30100'
    recordingIndicator.style.borderRadius = '50px'
    recordingIndicator.style.position = 'fixed'
    recordingIndicator.style.bottom = '36px'
    recordingIndicator.style.right = '36px'
    recordingIndicator.style.width = '400px'
    recordingIndicator.style.height = '50px'
    recordingIndicator.style['background-color'] = '#f7f7f7'
    recordingIndicator.style['box-shadow'] = '0 7px 10px 0 rgba(0,0,0,0.1)'
    recordingIndicator.style.transition = 'bottom 100ms linear'
    recordingIndicator.style['z-index'] = 1000000000000000
    recordingIndicator.addEventListener(
      'mouseenter',
      function (event) {
        event.target.style.visibility = 'hidden'
        setTimeout(function () {
          event.target.style.visibility = 'visible'
        }, 1000)
      },
      false
    )
    window.document.body.appendChild(recordingIndicator)
    browser.runtime.onMessage.addListener(function (
      message,
      sender, // eslint-disable-line
      sendResponse
    ) {
      if (message.recordNotification) {
        recordingIndicator.contentWindow.postMessage(
          {
            direction: 'from-recording-module',
            command: message.command,
            target: message.target,
            value: message.value,
          },
          '*'
        )
       recordingIndicator.style.borderColor = 'black'
        setTimeout(() => {
         recordingIndicator.style.borderColor = '#d30100'
        }, 1000)
        sendResponse(true)
      }
    })
    return browser.runtime
      .sendMessage({
        setFrameNumberForTab: true,
        indicatorIndex: indicatorIndex,
      })
      .catch(() => { })
  }
}

function getFrameCount() {
  return browser.runtime.sendMessage({
    requestFrameCount: true,
  })
}

function removeRecordingIndicator() {
  if (frameLocation === 'root' && recordingIndicator) {
    recordingIndicator.parentElement.removeChild(recordingIndicator)
    recordingIndicator = undefined
  }
}

// set frame id
async function getFrameLocation() {
  let currentWindow = window
  let currentParentWindow
  let recordingIndicatorIndex
  let frameCount

  while (currentWindow !== window.top) {
    currentParentWindow = currentWindow.parent
    if (!currentParentWindow.frames.length) {
      break
    }

    if (currentParentWindow === window.top) {
      frameCount = await getFrameCount().catch(() => { })
      if (frameCount) recordingIndicatorIndex = frameCount.indicatorIndex
    }

    for (let idx = 0; idx < currentParentWindow.frames.length; idx++) {
      const frame = currentParentWindow.frames[idx]

      if (frame === currentWindow) {
        frameLocation =
          ':' +
          calculateFrameIndex({
            indicatorIndex: recordingIndicatorIndex,
            targetFrameIndex: idx,
          }) +
          frameLocation
        currentWindow = currentParentWindow
        break
      }
    }
  }
  frameLocation = 'root' + frameLocation
  await browser.runtime
    .sendMessage({ frameLocation: frameLocation })
    .catch(() => { })
}

function recalculateFrameLocation(message, _sender, sendResponse) {
  if (message.recalculateFrameLocation) {
    ; (async () => {
      removeRecordingIndicator()
      setTimeout(async () => {
        await addRecordingIndicator()
      }, 100)
      frameLocation = ''
      await getFrameLocation()
      sendResponse(true)
    })()
    return true
  }
}

browser.runtime.onMessage.addListener(recalculateFrameLocation)

  // runs in the content script of each frame
  // e.g., once on load
  ; (async () => {
    await getFrameLocation()
  })()

window.recorder = recorder
window.contentSideexTabId = contentSideexTabId
window.Recorder = Recorder

/* record */
export function record(
  command,
  target,
  value,
  insertBeforeLastCommand,
  actualFrameLocation
) {
  browser.runtime
    .sendMessage({
      command: command,
      target: target,
      value: value,
      insertBeforeLastCommand: insertBeforeLastCommand,
      frameLocation:
        actualFrameLocation != undefined ? actualFrameLocation : frameLocation,
      commandSideexTabId: contentSideexTabId,
    })
    .catch((e) => {
      console.log(`error : ${e}\n${e.stack}`);
      //recorder.detach()
    })
}

window.record = record

export { Recorder, recorder }
