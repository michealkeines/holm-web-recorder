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
import ActionButton from '../ActionButton'
import classNames from 'classnames'
import UiState from '../../../stores/view/UiState'
import { parse } from 'modifier-keys'
import './style.css'

export default class SaveButton extends React.Component {
  render() {
    const props = { ...this.props }
    delete props.unsaved
    return (
      <ActionButton
        data-tip={`<p>Save Session <span style="color: #929292;padding-left: 5px;">${
          !UiState.keyboardShortcutsEnabled
            ? ''
            : parse('s', { primaryKey: true })
        }</span></p>`}
        {...props}
        className={classNames(
          'si-save',
          { pulse: this.props.unsaved },
          this.props.className
        )}
        aria-label="Save Session"
      /> // eslint-disable-line react/prop-types
    )
  }

  static propTypes = {
    unsaved: PropTypes.bool,
  }
}
