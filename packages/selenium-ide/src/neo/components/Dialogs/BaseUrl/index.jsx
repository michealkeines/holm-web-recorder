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
import Modal from '../../Modal'
import DialogContainer from '../Dialog'
import LabelledInput from '../../LabelledInput'
import logoFile from '../../../assets/images/holm.png'
import FlatButton from '../../FlatButton'
import './style.css'

export default class BaseUrlDialog extends React.Component {
  static propTypes = {
    isSelectingUrl: PropTypes.bool,
    isInvalid: PropTypes.bool,
    confirmLabel: PropTypes.string,
  }
  render() {
    return (
      <Modal
        className="stripped"
        isOpen={this.props.isSelectingUrl}
        modalTitle={BaseUrlDialogContents.modalTitleElement}
        modalDescription={BaseUrlDialogContents.modalDescriptionElement}
      >
        <BaseUrlDialogContents {...this.props} />
      </Modal>
    )
  }
}

class BaseUrlDialogContents extends React.Component {
  static modalTitleElement = 'baseUrlTitle'
  static modalDescriptionElement = 'baseUrlDescription'
  constructor(props) {
    super(props)
    this.state = {
      url: '',
    }
    this.urlRegex = /^https?:\/\//
    this.onUrlChange = this.onUrlChange.bind(this)
  }
  static propTypes = {
    isInvalid: PropTypes.bool,
    onUrlSelection: PropTypes.func,
    cancel: PropTypes.func,
  }
  onUrlChange(url) {
    this.setState({ url })
  }
  render() {
    return (
      <DialogContainer
        title={
          this.props.isInvalid
            ? 'Session base URL is invalid!'
            : "Set your Session's base URL"
        }
        type={this.props.isInvalid ? 'warn' : 'info'}
        renderImage={() => <img height={36} alt="se-ide-logo" src={logoFile} />}
        renderTitle={() => (
          <div>
            <div className="main-title">
              Holm Security - Web Recorder
            </div>
            <div className="main-subtitle">
              Record the login sequence session to find vulnerabilities behind login.
            </div>
          </div>
        )}
        buttons={[
          <FlatButton
            type="submit"
            disabled={!this.urlRegex.test(this.state.url)}
            onClick={() => {
              this.props.onUrlSelection(this.state.url)
            }}
            key="ok"
          >
            {/* {this.props.confirmLabel || 'confirm'} */}
            START RECORDING
          </FlatButton>,
          <FlatButton onClick={this.props.cancel} key="cancel">
          BACK
        </FlatButton>
        ]}
        onRequestClose={this.props.cancel}
        modalTitle={BaseUrlDialogContents.modalTitleElement}
        modalDescription={BaseUrlDialogContents.modalDescriptionElement}
      >
        <p>
          Specify the URL to start the recording from in order to perform the complete login sequence.<br/>Remember that you want to record all the steps required to successfully be authenticated to the web application.
        </p>
        <LabelledInput
          name="baseUrl"
          label="url"
          placeholder="https://www.holmsecurity.com/"
          value={this.state.url}
          onChange={this.onUrlChange}
          autoFocus
        />
        <p>Note: Do not record any more steps than required. For example, do not record any logout action which can later impact the session.</p>
      </DialogContainer>
    )
  }
}
