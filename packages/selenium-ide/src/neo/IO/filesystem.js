// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import browser from 'webextension-polyfill'
import { js_beautify as beautify } from 'js-beautify'
import UpgradeProject from './migrate'
import {
  verifyFile,
  FileTypes,
  migrateTestCase,
  migrateProject,
  migrateUrls,
} from './legacy/migrate'
import TestCase from '../models/TestCase'
import UiState from '../stores/view/UiState'
import PlaybackState from '../stores/view/PlaybackState'
import ModalState from '../stores/view/ModalState'
import Selianize, { ParseError } from 'selianize'
import Manager from '../../plugin/manager'
import chromeGetFile from './filesystem/chrome'
import firefoxGetFile from './filesystem/firefox'
import { userAgent as parsedUA } from '../../common/utils'
import { project as projectProcessor } from '@seleniumhq/side-utils'

export function getFile(path) {
  const browserName = parsedUA.browser.name
  return (() => {
    if (browserName === 'Chrome') {
      return chromeGetFile(path)
    } else if (browserName === 'Firefox') {
      return firefoxGetFile(path)
    } else {
      return Promise.reject(
        new Error('Operation is not supported in this browser')
      )
    }
  })().then(blob => {
    return new Promise(res => {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        res(reader.result)
      })
      reader.readAsDataURL(blob)
    })
  })
}

export function loadAsText(blob) {
  return new Promise(res => {
    const fileReader = new FileReader()
    fileReader.onload = e => {
      res(e.target.result)
    }

    fileReader.readAsText(blob)
  })
}

export function saveProject(_project) {
  const project = _project.toJS()
  downloadProject(project)
  UiState.saved()
}

function sendSaveProjectEvent(project) {
  const saveMessage = {
    action: 'event',
    event: 'saveProject',
    options: {
      project,
    },
  }
  browser.runtime.sendMessage(Manager.controller.id, saveMessage)
}

function downloadProject(project) {
  return exportProject(project).then(snapshot => {
    if (snapshot) {
      project.snapshot = snapshot
      Object.assign(project, Manager.emitDependencies())
    }
    if (UiState.isControlled) {
      //If in control mode, send the project in a message and skip downloading
      sendSaveProjectEvent(project)
    } else {
      browser.downloads.download({
        filename: projectProcessor.sanitizeProjectName(project.name) + '.json',
        url: createBlob(
          'application/side',
          beautify(JSON.stringify(project), { indent_size: 2 })
        ),
        saveAs: true,
        conflictAction: 'overwrite',
      })
    }
  })
}

function exportProject(project) {
  return Manager.validatePluginExport(project).then(() => {
    return Selianize(project, {
      silenceErrors: true,
      skipStdLibEmitting: true,
    }).catch(err => {
      const markdown = ParseError((err && err.message) || err)
      ModalState.showAlert({
        title: 'Error saving project',
        description: markdown,
        confirmLabel: 'download log',
        cancelLabel: 'close',
      }).then(choseDownload => {
        if (choseDownload) {
          browser.downloads.download({
            filename: project.name + '-logs.md',
            url: createBlob('text/markdown', markdown),
            saveAs: true,
            conflictAction: 'overwrite',
          })
        }
      })
      return Promise.reject()
    })
  })
}

export function downloadUniqueFile(filename, body, mimeType = 'text/plain') {
  browser.downloads.download({
    filename,
    url: createBlob(mimeType, body),
    saveAs: true,
    conflictAction: 'overwrite',
  })
}

let previousFile = null
// eslint-disable-next-line
function createBlob(mimeType, data) {
  const blob = new Blob([data], {
    type: mimeType,
  })
  // If we are replacing a previously generated file we need to
  // manually revoke the object URL to avoid memory leaks.
  if (previousFile !== null) {
    window.URL.revokeObjectURL(previousFile)
  }
  previousFile = window.URL.createObjectURL(blob)
  return previousFile
}

export function loadProject(project, file) {
  function displayError(error) {
    ModalState.showAlert({
      title: 'Error Opening Recording',
      description: error.message,
      confirmLabel: 'close',
    })
  }
  return loadAsText(file).then(contents => {
    if (/\.side$/i.test(file.name) || /\.json$/i.test(file.name)) {
      loadJSProject(project, UpgradeProject(JSON.parse(contents)))
    } else {
      try {
        const type = verifyFile(contents)
        if (type === FileTypes.Suite) {
          ModalState.importSuite(contents, files => {
            try {
              loadJSProject(project, migrateProject(files))
            } catch (error) {
              displayError(error)
            }
          })
        } else if (type === FileTypes.TestCase) {
          let { test, baseUrl } = migrateTestCase(contents)
          if (project.urls.length && !project.urls.includes(baseUrl)) {
            ModalState.showAlert({
              title: 'Migrate test case',
              description: `The test case you're trying to migrate has a different base URL (${baseUrl}) than the project's one.  \nIn order to migrate the test case URLs will be made absolute.`,
              confirmLabel: 'migrate',
              cancelLabel: 'discard',
            }).then(choseMigration => {
              if (choseMigration) {
                UiState.selectTest(
                  project.addTestCase(
                    TestCase.fromJS(migrateUrls(test, baseUrl))
                  )
                )
              }
            })
          } else {
            UiState.selectTest(
              project.addTestCase(TestCase.fromJS(test, baseUrl))
            )
          }
        }
      } catch (error) {
        displayError(error)
      }
    }
  })
}

export function loadJSProject(project, data) {
  UiState.changeView('Tests')
  PlaybackState.clearPlayingCache()
  UiState.clearViewCache()
  project.fromJS(data)
  UiState.projectChanged()
  Manager.emitMessage({
    action: 'event',
    event: 'projectLoaded',
    options: {
      projectName: project.name,
      projectId: project.id,
    },
  })
}
