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

import React from 'react'
import PropTypes from 'prop-types'
import uuidv4 from 'uuid/v4'
import { parse } from 'modifier-keys'
import UiState from '../../../stores/view/UiState'
import './style.css'

export default class OpenButton extends React.Component {
  render() {
    return (
      <span className="file-input">
        <OpenInput
          onFileSelected={this.props.onFileSelected}
          labelMarkup={<i className="btn-action si-open" />}
          openFile={this.props.openFile}
        />
      </span>
    )
  }
  static propTypes = {
    onFileSelected: PropTypes.func.isRequired,
    openFile: PropTypes.func,
  }
}

export class OpenInput extends React.Component {
  constructor(props) {
    super(props)
    this.id = uuidv4()
    this.openFile = this.openFile.bind(this)
    this.handleChange = this.handleChange.bind(this)
    if (props.openFile) {
      props.openFile(this.openFile)
    }
  }
  openFile() {
    if (this.input) {
      this.input.click()
    } else {
      return false
    }
  }
  handleChange(e) {
    this.props.onFileSelected(e.target.files[0])
    this.input.value = ''
  }
  render() {
    return (
      <React.Fragment>
        <input
          id={this.id}
          ref={input => {
            this.input = input
          }}
          type="file"
          onChange={this.handleChange}
          onFocus={() => {
            if (this.label) {
              this.label.dispatchEvent(new Event('focusexternal'))
            }
          }}
          onBlur={() => {
            if (this.label) {
              this.label.dispatchEvent(new Event('blurexternal'))
            }
          }}
        />
        <label
          ref={label => {
            this.label = label
          }}
          data-tip={`<p>Open Session <span style="color: #929292;padding-left: 5px;">${
            !UiState.keyboardShortcutsEnabled
              ? ''
              : parse('o', { primaryKey: true })
          }</span></p>`}
          // We need special events because Focus and Blur are lost before the tooltip is shown
          data-event="focusexternal mouseenter"
          data-event-off="blurexternal mouseleave"
          htmlFor={this.id}
          onFocus={() => {
            this.input.focus()
          }}
        >
          {this.props.labelMarkup}
        </label>
      </React.Fragment>
    )
  }
  static propTypes = {
    onFileSelected: PropTypes.func.isRequired,
    labelMarkup: PropTypes.object,
    openFile: PropTypes.func,
  }
}
