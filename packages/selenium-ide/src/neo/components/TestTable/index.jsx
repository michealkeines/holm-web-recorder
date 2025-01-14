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
import { observe } from 'mobx'
import { observer } from 'mobx-react'
import { PropTypes as MobxPropTypes } from 'mobx-react'
import classNames from 'classnames'
import UiState from '../../stores/view/UiState'
import PlaybackState from '../../stores/view/PlaybackState'
import TestRow from '../TestRow'
import { deriveCommandLevels } from '../../playback/playback-tree/command-leveler'
import './style.css'

@observer
export default class TestTable extends React.Component {
  constructor(props) {
    super(props)
    this.newCommand = {}
    this.detectNewCommand = this.detectNewCommand.bind(this)
    this.disposeNewCommand = this.disposeNewCommand.bind(this)
    this.handleScroll = this.handleScroll.bind(this)
    this.scrollToLastPos = this.scrollToLastPos.bind(this)
    this.newObserverDisposer = observe(
      this.props.commands,
      this.detectNewCommand
    )
    this.commandLevels = []
    this.node = null
  }
  static propTypes = {
    commands: MobxPropTypes.arrayOrObservableArray,
    callstackIndex: PropTypes.number,
    selectedCommand: PropTypes.string,
    selectCommand: PropTypes.func,
    addCommand: PropTypes.func,
    removeCommand: PropTypes.func,
    swapCommands: PropTypes.func,
    clearAllCommands: PropTypes.func,
  }
  detectNewCommand(change) {
    this.newCommand = change.added[0]
  }
  disposeNewCommand() {
    this.newCommand = undefined
  }
  scrollToLastPos() {
    if (UiState.selectedTest.test.scrollY) {
      this.node.scrollTop = UiState.selectedTest.test.scrollY
    } else {
      this.node.scrollTop = 0
    }
  }
  componentDidUpdate(prevProps) {
    if (prevProps.commands !== this.props.commands) {
      this.newObserverDisposer()
      if (this.props.commands) {
        this.newObserverDisposer = observe(
          this.props.commands,
          this.detectNewCommand
        )
      }
    }
  }
  handleScroll() {
    UiState.selectedTest.test.scrollY = this.node.scrollTop
  }
  render() {
    if (this.props.commands)
      this.commandLevels = deriveCommandLevels(this.props.commands)
    const commandStatePrefix =
      this.props.callstackIndex !== undefined
        ? `${this.props.callstackIndex}:`
        : ''
    return [
      <div key="header" className="test-table test-table-header">
        <table>
          <thead>
            <tr>
              <th>
                <span>Recorded Action</span>
              </th>
              <th>Selector</th>
              <th>Input (if any)</th>
            </tr>
          </thead>
        </table>
      </div>,
      <div
        onScroll={this.handleScroll}
        ref={node => {
          return (this.node = node || this.node)
        }}
        key="body"
        className={classNames(
          'test-table',
          'test-table-body',
          { paused: PlaybackState.paused },
          { 'breakpoints-disabled': PlaybackState.breakpointsDisabled }
        )}
      >
        <table>
          {/* thead is invisiable to the user but it is visible to the Screen Reader */}
          <caption
            className={classNames('hidden-visualy-screen-reader-visible')}
            tabIndex={-1}
          >
            Commands, targets and Values
          </caption>
          <thead
            className={classNames('hidden-visualy-screen-reader-visible')}
            tabIndex={-1}
          >
            <tr
              className={classNames('hidden-visualy-screen-reader-visible')}
              tabIndex={-1}
            >
              <th
                id="th_command_position"
                scope="col"
                className={classNames('hidden-visualy-screen-reader-visible')}
                tabIndex={-1}
              >
                Command Position
              </th>
              <th id="th_command" scope="col">
                Command
              </th>
              <th id="th_target" scope="col">
                Target
              </th>
              <th id="th_value" scope="col">
                Value
              </th>
              <th id="th_more_buttons" scope="col">
                More options
              </th>
            </tr>
          </thead>
          <tbody>
            {this.props.commands
              ? this.props.commands
                  .map((command, index) => (
                    <TestRow
                      key={command.id}
                      status={classNames(
                        PlaybackState.commandState.get(
                          commandStatePrefix + command.id
                        )
                          ? PlaybackState.commandState.get(
                              commandStatePrefix + command.id
                            ).state
                          : ''
                      )}
                      selected={this.props.selectedCommand === command.id}
                      readOnly={PlaybackState.isPlaying}
                      singleCommandExecutionEnabled={
                        PlaybackState.isSingleCommandExecutionEnabled
                      }
                      index={index}
                      command={command}
                      new={
                        command === this.newCommand
                          ? this.disposeNewCommand
                          : undefined
                      }
                      scrollToLastPos={this.scrollToLastPos}
                      isPristine={false}
                      select={this.props.selectCommand}
                      startPlayingHere={PlaybackState.startPlaying}
                      executeCommand={PlaybackState.playCommand}
                      moveSelection={UiState.selectCommandByIndex}
                      addCommand={this.props.addCommand}
                      remove={this.props.removeCommand}
                      swapCommands={this.props.swapCommands}
                      copyToClipboard={UiState.copyToClipboard}
                      pasteFromClipboard={UiState.pasteFromClipboard}
                      clearAllCommands={this.props.clearAllCommands}
                      setSectionFocus={UiState.setSectionFocus}
                      level={this.commandLevels[index]}
                      headers={{
                        commandIndexId: 'th_command_position',
                        commandId: 'th_command',
                        targetId: 'th_target',
                        valueId: 'th_value',
                        moreButtonsId: 'th_more_buttons',
                      }}
                    />
                  ))
                  .concat(
                    <TestRow
                      key={UiState.displayedTest.id}
                      selected={
                        this.props.selectedCommand ===
                        UiState.pristineCommand.id
                      }
                      index={this.props.commands.length}
                      command={UiState.pristineCommand}
                      scrollToLastPos={this.scrollToLastPos}
                      isPristine={true}
                      select={this.props.selectCommand}
                      addCommand={this.props.addCommand}
                      moveSelection={UiState.selectCommandByIndex}
                      pasteFromClipboard={UiState.pasteFromClipboard}
                      setSectionFocus={UiState.setSectionFocus}
                      headers={{
                        commandIndexId: 'th_command_position',
                        commandId: 'th_command',
                        targetId: 'th_target',
                        valueId: 'th_value',
                        moreButtonsId: 'th_more_buttons',
                      }}
                    />
                  )
              : null}
          </tbody>
        </table>
        <div className="filler" />
      </div>,
    ]
  }
}
