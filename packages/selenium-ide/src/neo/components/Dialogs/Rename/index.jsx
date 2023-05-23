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
import FlatButton from '../../FlatButton'
import LabelledInput from '../../LabelledInput'
import DialogContainer from '../Dialog'
import classNames from 'classnames'
import logoFile from '../../../assets/images/holm.png'
import './style.css'

export default class RenameDialog extends React.Component {
  static propTypes = {
    isEditing: PropTypes.bool,
    type: PropTypes.string,
    value: PropTypes.string,
    verify: PropTypes.func,
    cancel: PropTypes.func,
    setValue: PropTypes.func,
  }
  render() {
    return (
      <Modal
        className={classNames('stripped', 'rename-dialog')}
        isOpen={this.props.isEditing}
        onRequestClose={this.props.cancel}
        modalTitle={RenameDialogContents.modalTitleElement}
        modalDescription={RenameDialogContents.modalDescriptionElement}
      >
        <RenameDialogContents {...this.props} />
      </Modal>
    )
  }
}

class RenameDialogContents extends React.Component {
  static modalTitleElement = 'renameTitle'
  static modalDescriptionElement = 'renameDescription'
  constructor(props) {
    super(props)
    this.state = {
      isRenaming: !!props.value,
      value:
        props.isNewTest || props.type === 'project'
          ? ''
          : props.value
            ? props.value
            : '',
      valid: true,
      type: props.type,
    }
  }
  handleChange(inputValue) {
    this.setState({
      value: inputValue,
      valid: this.props.verify(inputValue),
    })
  }
  render() {
    const content = {
      title: this.props.isNewTest
        ? 'Output File'
        : this.props.type === 'project'
          ? 'Recorder Session'
          : `${this.state.isRenaming ? 'Rename' : 'Add new'} ${
              this.state.type === 'project' ? 'Session' : 'Output'
            }`,
      bodyTop: this.props.isNewTest ? (
        <span id="renameDescription">
          Please provide a name for your output file.
        </span>
      ) : this.props.type === 'project' ? (
        <span id="renameDescription">
          Please provide the name of this login sequence session.
        </span>
      ) : (
        <span
          className="hidden"
          id="renameDescription"
        >{`Please provide the name of this recorded session.`}</span>
      ),
      bodyBottom:
       ( <span>
          Save and upload this session file to your Security Center account in order to scan the web application for vulnerabilities. Learn more on {' '}
            <a
              href="https://www.holmsecurity.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              How to scan a web application behind login.
            </a>
        </span>),
      submitButton:
        this.props.isNewTest || this.props.type === 'project'
          ? 'OK'
          : this.state.isRenaming
            ? 'rename'
            : 'add',
      cancelButton: this.props.isNewTest ? 'later' : 'cancel',
      inputLabel: this.props.isNewTest
        ? 'session name'
        : (this.state.type === 'project'? 'Session' : 'File') + ' name',
    }
    return (
      <DialogContainer
        title={content.title}
        type={this.state.valid ? 'info' : 'warn'}
        renderImage={() => <img height={36} alt="se-ide-logo" src={logoFile} />}
        renderTitle={() => (
          <div>
            <div className="welcome-dialog__title">
              <b>Holm Security - Web Recorder</b>
            </div>
            <div className="welcome-dialog__subtitle">
              Record the login sequence session to find vulnerabilities behind login.
            </div>
          </div>
        )}
        buttons={[
          <FlatButton
            type="submit"
            disabled={!this.state.value || !this.state.valid}
            onClick={() => {
              this.props.setValue(this.state.value)
            }}
            style={{
              marginRight: '0',
            }}
            key="ok"
          >
            {/* {content.submitButton} */}
            OK
          </FlatButton>,
          <FlatButton
            disabled={this.props.isNewTest && !!this.state.value}
            onClick={this.props.cancel}
            key="cancel"
          >
            {/* {content.cancelButton} */}
            BACK
          </FlatButton>,
        ]}
        onRequestClose={this.props.cancel}
        modalTitle={RenameDialogContents.modalTitleElement}
        modalDescription={RenameDialogContents.modalDescriptionElement}
      >
        {content.bodyTop}
        <LabelledInput
          name={(this.state.type === 'project'? 'Session' : 'File') + 'Name'}
          label={content.inputLabel}
          value={this.state.value}
          onChange={this.handleChange.bind(this)}
          autoFocus
        />
        {!this.state.valid && (
          <span className="message">
            A {(this.state.type === 'project'? 'Session' : 'File')} with this name already exists
          </span>
        )}
        {content.bodyBottom}
      </DialogContainer>
    )
  }
  static propTypes = {
    isEditing: PropTypes.bool,
    type: PropTypes.string,
    value: PropTypes.string,
    verify: PropTypes.func,
    cancel: PropTypes.func,
    setValue: PropTypes.func,
    isNewTest: PropTypes.bool,
  }
}
