import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  AbstractStatementWithArgs,
  CompoundStatement,
  CompoundStatementWithArgs,
  Program,
  ProgramStatement,
  initDefaultArgumentType,
} from '@vpl/program';
import { Argument, Language } from '@vpl/language';
import { consume } from '@lit/context';
import { languageContext, programContext } from '@/editor/context/editor-context';
import {
  editorVariablesModalCustomEvent,
  graphicalEditorCustomEvent,
  statementCustomEvent,
} from '@/editor/editor-custom-events';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { globalStyles } from '../global-styles';
import * as icons from '../icons';
import { EditorModal } from './editor-modal';
import Types from '@vpl/types.ts';

@customElement('ge-statement')
export class GEStatement extends LitElement {
  //#region Styles
  static styles = [
    globalStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }

      .expr-arg {
        white-space: nowrap;
        overflow-x: auto;
        width: 100%;
      }

      .statement-controls {
        display: flex;
        gap: 0.35rem;
        margin-left: auto;
        height: 100%;
      }

      .statement-label-wrapper {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        position: relative;
        /* width: 100%; */
      }

      .statement-header {
        display: flex;
        flex-direction: row;
        /* justify-content: space-between; */
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem;
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
        height: 55px;
      }

      .nested {
        padding: 0.75rem;
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }

      .hidden {
        display: none;
      }

      .bottom-radius {
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }

      .statement-controls-modal-wrapper {
        display: flex;
        position: relative;
      }

      .statement-controls-modal {
        bottom: 0;
        left: -94px;
      }

      .statement-controls-modal::part(dialog) {
        padding: 0;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      }

      .statement-controls-buttons {
        display: flex;
        flex-direction: column;
      }

      .statement-controls-buttons editor-button {
        display: flex;
        justify-items: center;
        gap: 0.25rem;
        white-space: nowrap;
        box-shadow: none;
        border: none;
        border-bottom: 1px solid var(--gray-300);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      .statement-controls-buttons editor-button:last-child {
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
        border-bottom: none;
      }

      .remove-statement-button {
        color: var(--red-600);
      }

      .statement-controls-expand-button {
      }

      .expand-nested-block-button {
        display: flex;
        align-items: center;
        padding-left: 4px;
        padding-right: 4px;
        cursor: pointer;
      }

      .statement-arguments-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .user-proc-wrapper {
        display: block;
        padding: 0;
        border: none;
        box-shadow: none;
        background: none;
      }

      .ok-button {
        display: flex;
        justify-content: center;
        color: var(--green-600);
        gap: 4px;
      }

      .stmt-brief-desc-wrapper {
        max-width: 800px;
        text-align: justify;
        text-justify: inter-word;
      }

      .stmt-desc-modal {
        position: absolute;
        bottom: -4px;
      }

      .stmt-icon {
        cursor: help;
      }

      .stmt-desc-modal * {
        outline: none;
      }

      .stmt-desc-inner-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 500px;
        overflow: auto;
      }

      .stmt-desc-item-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stmt-desc-label {
        font-weight: 600;
        font-size: 1.125rem;
      }

      .divider {
        width: 100%;
        height: 1px;
        background: var(--gray-300);
        margin-bottom: 8px;
      }

      @media (min-width: 500px) {
        .statement-label {
          white-space: nowrap;
        }
      }
    `,
  ];
  //#endregion

  //#region Props
  @property() statement: ProgramStatement;
  @property() index: number;
  @property() nestedBlockVisible: boolean = true;
  @property() isProcBody: boolean = false;
  @property() isExample: boolean = false;
  @property() exampleBlockIsVisible: boolean = false;
  @property({ type: Boolean }) skeletonizeMode: boolean = false;
  @property({ type: Object }) selectedStatements: Set<string>;
  @property({ type: Function }) toggleStatementSelection: (stmtUuid: string) => void;
  //#endregion

  //#region Context
  @consume({ context: languageContext })
  @property()
  language?: Language;

  @consume({ context: programContext })
  @property()
  program?: Program;
  //#endregion

  //#region Refs
  statementHeaderRef: Ref<HTMLElement> = createRef();
  statementNestedBlockRef: Ref<HTMLElement> = createRef();
  statementControlsModalRef: Ref<EditorModal> = createRef();
  multipleArgsModalRef: Ref<EditorModal> = createRef();
  procModalRef: Ref<EditorModal> = createRef();
  stmtDescModalRef: Ref<EditorModal> = createRef();
  //#endregion

  //#region Lifecycles

  constructor() {
    super();
    this.addEventListener(editorVariablesModalCustomEvent.VARIABLE_SELECTED, (e: CustomEvent) => {
      if (this.statement.id === 'setvar') {
        (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[1].type = this.program.header
          .userVariables[
          (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[0].value as string
        ]
          ? this.program.header.userVariables[
              (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[0].value as string
            ].type
          : this.language.variables[
              (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[0].value as string
            ]
          ? 'device'
          : 'invalid';
        (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[1].value =
          (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[1].type === Types.boolean_expression
            ? initDefaultArgumentType(Types.boolean_expression)
            : null;

        const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      }
    });
  }

  updated() {
    this.statementHeaderRef.value.setAttribute(
      'style',
      `background-color: ${
        this.language.statements[this.statement.isInvalid ? '_err' : this.statement.id].backgroundColor
      }; color: ${this.language.statements[this.statement.isInvalid ? '_err' : this.statement.id].foregroundColor}; ${
        this.statement.isInvalid ? 'border: 4px dashed #facc15' : ''
      }`
    );

    if (this.statementNestedBlockRef.value) {
      this.statementNestedBlockRef.value.setAttribute(
        'style',
        `background-color: ${
          this.language.statements[this.statement.isInvalid ? '_err' : this.statement.id].backgroundColor
        }3a; color: ${this.language.statements[this.statement.isInvalid ? '_err' : this.statement.id].foregroundColor};`
      );
    }
  }
  //#endregion

  //#region Handlers

  handleToggleNestedBlockVisibility() {
    this.nestedBlockVisible = !this.nestedBlockVisible;
  }

  handleRemoveStatement(e: Event) {
    const event = new CustomEvent(statementCustomEvent.REMOVE, {
      bubbles: false,
      composed: true,
      detail: { index: this.index },
    });
    this.dispatchEvent(event);
    this.handleHideStatementControlsModal();
    e.stopPropagation();
  }

  handleMoveStatementUp(e: Event) {
    const event = new CustomEvent(statementCustomEvent.MOVE_UP, {
      bubbles: false,
      composed: true,
      detail: { index: this.index },
    });
    this.dispatchEvent(event);
    this.handleHideStatementControlsModal();
    e.stopPropagation();
  }

  handleMoveStatementDown(e: Event) {
    const event = new CustomEvent(statementCustomEvent.MOVE_DOWN, {
      bubbles: false,
      composed: true,
      detail: { index: this.index },
    });
    this.dispatchEvent(event);
    this.handleHideStatementControlsModal();
    e.stopPropagation();
  }

  handleToggleStatementControlsModal(e: Event) {
    this.statementControlsModalRef.value.toggleModal();
    e.stopPropagation();
  }

  handleHideStatementControlsModal() {
    this.statementControlsModalRef.value.hideModal();
  }

  handleShowProcDef() {
    if (this.skeletonizeMode) return; // Prevent redirection in skeletonize mode
    this.procModalRef.value.showModal();
  }

  handleShowStmtDescModal(e: Event) {
    if (!this.exampleBlockIsVisible) {
      this.exampleBlockIsVisible = true;
    }
    if (this.stmtDescModalRef.value) {
      this.stmtDescModalRef.value.showModal();
    }
    e.stopPropagation();
  }
  //#endregion

  //#region Templates
  multipleArgumentTemplate(argumentsArray: Argument[]) {
    return html`
      <editor-button class="expr-arg" @click="${() => this.multipleArgsModalRef.value.showModal()}">
        <div style="display: flex; gap: 4px; align-items: center;">
          <editor-icon .icon="${icons.threeDots}"></editor-icon>
          <div>Arguments</div>
        </div>
      </editor-button>
      <editor-modal ${ref(this.multipleArgsModalRef)} .modalTitle="${'Set Arguments'}">
        <div class="statement-arguments-wrapper">
          ${argumentsArray.map(
            (arg, i) =>
              html`
                <ge-statement-argument
                  .argument="${arg}"
                  .argPosition="${i}"
                  .stmtId="${this.statement.id}"
                  .showLabel="${true}"
                  .variableKey="${this.statement.id === 'setvar' && arg.type === Types.unknown
                    ? (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[0].value
                    : null}">
                </ge-statement-argument>
              `
          )}
          <editor-button class="ok-button" @click="${() => this.multipleArgsModalRef.value.hideModal()}">
            <editor-icon .icon="${icons.checkLg}"></editor-icon>
            <span>OK</span>
          </editor-button>
        </div>
      </editor-modal>
    `;
  }

  statementTemplate(hasNestedBlock: boolean) {
    return html`
      <div
        ${ref(this.statementHeaderRef)}
        class="statement-header ${!hasNestedBlock || !this.nestedBlockVisible ? 'bottom-radius' : ''} ${this.language
          .statements[this.statement.id].isUserProcedure
          ? 'user-proc'
          : ''}">
        <div class="statement-label-wrapper">
          ${this.language.statements[this.statement.id].icon
            ? html`
                <editor-icon
                  class="stmt-icon"
                  title="Show Help"
                  @click="${this.handleShowStmtDescModal}"
                  .icon="${icons[this.language.statements[this.statement.isInvalid ? '_err' : this.statement.id].icon]}"
                  .color="${this.language.statements[this.statement.id].foregroundColor}"
                  .width="${24}"
                  .height="${24}">
                </editor-icon>
                ${this.language.statements[this.statement.id].description
                  ? html`
                      <editor-modal
                        class="stmt-desc-modal"
                        .modalTitle="${`Help for "${this.language.statements[this.statement.id].label}" statement`}"
                        .modalIcon="${icons.questionCircle}"
                        ${ref(this.stmtDescModalRef)}>
                        <div class="stmt-desc-inner-wrapper">
                          <div class="stmt-desc-item-wrapper">
                            <div class="stmt-desc-label">Description</div>
                            <div class="stmt-brief-desc-wrapper">
                              ${this.language.statements[this.statement.id].description.brief}
                            </div>
                          </div>
                          ${this.language.statements[this.statement.id].description.example
                            ? html`
                                <div class="stmt-desc-item-wrapper">
                                  <div class="stmt-desc-label">Example</div>
                                  <div class="stmt-brief-desc-wrapper">
                                    ${this.language.statements[this.statement.id].description.example.description}
                                  </div>
                                </div>
                                <div>
                                  ${this.exampleBlockIsVisible
                                    ? html`
                                        <div class="divider"></div>
                                        <ge-block
                                          .isExample="${true}"
                                          .block="${this.language.statements[this.statement.id].description.example
                                            .block}">
                                        </ge-block>
                                      `
                                    : nothing}
                                </div>
                              `
                            : nothing}
                        </div>
                      </editor-modal>
                    `
                  : nothing}
              `
            : nothing}

          <div class="statement-label">${this.language.statements[this.statement.id].label}</div>
        </div>
        ${(this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments
          ? (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments.length === 1
            ? html`
                <ge-statement-argument
                  ?disabled="${this.statement.isInvalid || this.skeletonizeMode}"
                  .argument="${(this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments[0]}"
                  .argPosition="${0}"
                  .stmtId="${this.statement.id}"
                  .isExample="${this.isExample}">
                </ge-statement-argument>
              `
            : this.multipleArgumentTemplate(
                (this.statement as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments
              )
          : nothing}
        <div class="statement-controls">
          <div class="statement-controls-modal-wrapper">
            ${!this.isExample && !this.skeletonizeMode
              ? html`
                  <editor-button
                    @click="${this.handleToggleStatementControlsModal}"
                    title="Statement Controls"
                    class="statement-controls-expand-button">
                    <editor-icon .icon="${icons.list}"></editor-icon>
                  </editor-button>
                  <editor-modal
                    class="statement-controls-modal"
                    .displayType="${'dialog'}"
                    .titleIsVisible="${false}"
                    .closeButtonIsVisible="${false}"
                    ${ref(this.statementControlsModalRef)}>
                    <div class="statement-controls-buttons">
                      <editor-button @click="${this.handleMoveStatementUp}" title="Move statement up">
                        <editor-icon .icon="${icons.arrowUp}"></editor-icon>
                        Move Up
                      </editor-button>
                      <editor-button @click="${this.handleMoveStatementDown}" title="Move statement down">
                        <editor-icon .icon="${icons.arrowDown}"></editor-icon>
                        Move Down
                      </editor-button>
                      <editor-button
                        @click="${this.handleRemoveStatement}"
                        title="Remove Statement"
                        class="remove-statement-button">
                        <editor-icon .icon="${icons.trash}"></editor-icon>
                        Delete
                      </editor-button>
                    </div>
                  </editor-modal>
                `
              : nothing}
          </div>
          ${(this.statement as CompoundStatement).block && !this.skeletonizeMode
            ? html`
                <div @click="${this.handleToggleNestedBlockVisibility}" class="expand-nested-block-button">
                  <editor-icon
                    .icon="${this.nestedBlockVisible ? icons.chevronDown : icons.chevronRight}"
                    .width="${18}"
                    .height="${18}"
                    title="Show Block"></editor-icon>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }
  //#endregion

  //#region Render
  render() {
    return html`
      <div
        class="statement-wrapper ${this.skeletonizeMode ? 'disabled' : ''}"
        style="${this.skeletonizeMode && this.selectedStatements?.has(this.statement._uuid) ? 'outline: 2px solid yellow;' : ''}"
        @click="${this.skeletonizeMode ? (e: Event) => { e.stopPropagation(); this.toggleStatementSelection(this.statement._uuid); } : null}">
        ${(this.statement as CompoundStatement).block
          ? html`
              ${this.statementTemplate(true)}
              <ge-block
                ${ref(this.statementNestedBlockRef)}
                style="background-color: ${this.language.statements[this.statement.id].backgroundColor}aa;"
                class="nested ${this.nestedBlockVisible ? '' : 'hidden'}"
                .block="${(this.statement as CompoundStatement).block}"
                .parentStmt="${this.statement}"
                .isProcBody="${this.isProcBody}"
                .isExample="${this.isExample}"
                .skeletonizeMode="${this.skeletonizeMode}">
              </ge-block>
            `
          : this.language.statements[this.statement.id]?.isUserProcedure && !this.isProcBody
          ? html`
              <editor-button
                @click="${this.handleShowProcDef}"
                class="user-proc-wrapper"
                ?disabled="${this.skeletonizeMode}"> <!-- Disable button in skeletonize mode -->
                ${this.statementTemplate(false)}
              </editor-button>
              <editor-modal
                ${ref(this.procModalRef)}
                .modalTitle="${this.language.statements[this.statement.id]?.label}"
                .modalIcon="${icons[this.language.statements[this.statement.id]?.icon]}"
                .backgroundColor="${this.language.statements[this.statement.id]?.backgroundColor}"
                .foregroundColor="${this.language.statements[this.statement.id]?.foregroundColor}"
                .isFullWidth="${true}"
                .isFullHeight="${true}">
                <ge-block
                  .isProcBody="${true}"
                  .isExample="${this.isExample}"
                  .block="${this.program.header.userProcedures[this.statement.id]}"
                  .skeletonizeMode="${this.skeletonizeMode}">
                </ge-block>
              </editor-modal>
            `
          : this.statementTemplate(false)}
      </div>
    `;
  }
  //#endregion
}

declare global {
  interface HTMLElementTagNameMap {
    'ge-statement': GEStatement;
  }
}
