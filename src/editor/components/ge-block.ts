import { consume } from '@lit/context';
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { languageContext, programContext } from '@/editor/context/editor-context';
import { Block, Program, ProgramStatement } from '@/vpl/program';
import { graphicalEditorCustomEvent, statementCustomEvent } from '@/editor/editor-custom-events';
import {
  CompoundLanguageStatement,
  CompoundLanguageStatementWithArgs,
  DeviceStatement,
  EditorModal,
  Language,
  UnitLanguageStatementWithArgs,
} from '@/index';
import { EditorMode } from './editor-controls';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { globalStyles } from '../global-styles';
import * as icons from '../icons';
import { v4 as uuidv4 } from 'uuid';

@customElement('ge-block')
export class GeBlock extends LitElement {
  //#region Styles
  static styles = [
    globalStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .add-new-statement-btn {
        width: fit-content;
        align-self: flex-end;
      }

      .add-statement-tabs {
        display: flex;
      }

      .add-statement-dialog-content-wrapper {
        display: flex;
        flex-direction: column;
        height: 500px;
      }

      .statement-type-button {
        background-color: white;
        border: none;
        box-shadow: none;
        padding: 0.25rem;
        border-radius: 0;
      }

      .add-statements-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .add-statement-search-field {
        font-family: var(--main-font) !important;
        box-shadow: none !important;
      }

      .add-statement-search-wrapper {
        position: sticky;
        top: 0;
        background: white;
        padding-bottom: 0.5rem;
      }

      .add-statement-search-input-wrapper {
        background: white;
        padding-bottom: 0.25rem;
      }

      .add-statement-options {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .add-statament-option-button {
        display: flex;
        gap: 0.25rem;
      }

      .device-select-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      #device-select {
        width: 100%;
      }

      .device-select-label {
        padding-left: 0.25rem;
      }

      .no-available-statements {
        padding-top: 2rem;
        text-align: center;
        color: var(--gray-500);
      }

      .statement {
        position: relative;
        margin-bottom: 0.5rem;
      }

      .statement.selected {
        outline: 2px solid var(--yellow-400);
        outline-offset: 2px;
      }
    `,
  ];
  //#endregion

  //#region Props
  @property() block: Block;
  @property() addStatementOptionsVisible: boolean = true;
  @property() addStatementOptionsFilter: string = '';
  @property() renderBasicStatements: boolean = true;
  @property() selectedDevice: string;
  @property() parentStmt: ProgramStatement;
  @property() isProcBody: boolean = false;
  @property() isExample: boolean = false;
  @property() editorMode: EditorMode = 'normal';
  @property() selectedStatements: ProgramStatement[] = [];
  //#endregion

  //#region Refs
  addStatementModalRef: Ref<EditorModal> = createRef();
  addProcedureModalRef: Ref<EditorModal> = createRef();
  //#endregion

  //#region Context
  @consume({ context: programContext, subscribe: true })
  @property({ attribute: false })
  program?: Program;

  @consume({ context: languageContext, subscribe: true })
  @property({ attribute: false })
  language?: Language;
  //#endregion

  //#region Computed
  get filteredAddStatementOptions() {
    type KeysAndLabels = {
      key: string;
      label: string;
    };

    let statementKeysAndLabels: KeysAndLabels[] = [];
    let filteredStatements = {};

    for (let stmtKey in this.language.statements) {
      statementKeysAndLabels.push({ key: stmtKey, label: this.language.statements[stmtKey].label });
    }
    statementKeysAndLabels = statementKeysAndLabels.filter((stmt) => {
      if (stmt.key.startsWith('_') || (this.isProcBody && this.language.statements[stmt.key].isUserProcedure)) {
        return false;
      }

      if (this.parentStmt) {
        if (this.language.statements[stmt.key].parents) {
          if (!this.language.statements[stmt.key].parents.includes(this.parentStmt.id)) {
            return false;
          }
        }
        if ((this.language.statements[this.parentStmt.id] as CompoundLanguageStatement).nestedStatements) {
          if (
            !(this.language.statements[this.parentStmt.id] as CompoundLanguageStatement).nestedStatements.includes(
              stmt.key
            )
          ) {
            return false;
          }
        }
      } else {
        if (this.language.statements[stmt.key].parents) {
          return false;
        }
      }

      if (this.addStatementOptionsFilter) {
        return stmt.label.toLowerCase().includes(this.addStatementOptionsFilter.toLowerCase());
      }
      return true;
    });
    for (let stmtLabel of statementKeysAndLabels) {
      if (stmtLabel.key in this.language.statements) {
        filteredStatements[stmtLabel.key] = this.language.statements[stmtLabel.key];
      }
    }
    return filteredStatements;
  }
  //#endregion

  //#region Lifecycle
  constructor() {
    super();
    this.addEventListener(statementCustomEvent.REMOVE, (e: CustomEvent) => {
      this.handleRemoveStatement(e);
    });
    this.addEventListener(statementCustomEvent.MOVE_UP, (e: CustomEvent) => {
      this.handleMoveStatementUp(e);
    });
    this.addEventListener(statementCustomEvent.MOVE_DOWN, (e: CustomEvent) => {
      this.handleMoveStatementDown(e);
    });
    this.addEventListener(graphicalEditorCustomEvent.EDITOR_MODE_CHANGED, ((e: CustomEvent) => {
      const previousMode = this.editorMode;
      this.editorMode = e.detail.mode;
      
      if (previousMode === 'skeletonize' && this.editorMode === 'normal') {
        // Clear selected blocks
        this.selectedStatements = [];
        
        // Dispatch event to ensure all blocks are visually reset
        const event = new CustomEvent(graphicalEditorCustomEvent.STATEMENT_SELECTION_CHANGED, {
          detail: { selectedStatements: [] },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
        
        // Force a re-render of this component
        this.requestUpdate();
      }
    }) as EventListener);
    this.addEventListener(graphicalEditorCustomEvent.STATEMENT_SELECTION_CHANGED, ((e: CustomEvent) => {
      this.selectedStatements = e.detail.selectedStatements;
      this.requestUpdate();
    }) as EventListener);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.language.deviceList) {
      this.selectedDevice = this.language.deviceList[0];
    }
  }
  //#endregion

  //#region Methods
  addNewStatement(stmtKey: string) {
    this.program.addStatement(this.block, {
      type: this.language.statements[stmtKey].type,
      key: stmtKey,
      arguments: (this.language.statements[stmtKey] as UnitLanguageStatementWithArgs | CompoundLanguageStatementWithArgs)
        .arguments,
    });

    const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
      bubbles: true,
      composed: true,
      detail: { programBodyUpdated: true },
    });
    this.dispatchEvent(event);
  }

  hideAddNewStatementDialog() {
    this.addStatementModalRef.value.hideModal();
  }

  showAddNewStatementOptions() {
    this.addStatementOptionsVisible = true;
  }
  //#endregion

  //#region Handlers
  handleMoveStatementUp(e: CustomEvent) {
    let statementIndex = e.detail.index;
    if (statementIndex > 0) {
      let tmpStatement = this.block[statementIndex];
      this.block[statementIndex] = this.block[statementIndex - 1];
      this.block[statementIndex - 1] = tmpStatement;
      this.requestUpdate();
      const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
        bubbles: true,
        composed: true,
        detail: { programBodyUpdated: true },
      });
      this.dispatchEvent(event);
    }
    e.stopPropagation();
  }

  handleMoveStatementDown(e: CustomEvent) {
    let statementIndex = e.detail.index;
    if (statementIndex < this.block.length - 1) {
      let tmpStatement = this.block[statementIndex];
      this.block[statementIndex] = this.block[statementIndex + 1];
      this.block[statementIndex + 1] = tmpStatement;
      this.requestUpdate();
      const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
        bubbles: true,
        composed: true,
        detail: { programBodyUpdated: true },
      });
      this.dispatchEvent(event);
    }
    e.stopPropagation();
  }

  handleRemoveStatement(e: CustomEvent) {
    let statementIndex = e.detail.index;
    this.block.splice(statementIndex, 1);
    this.requestUpdate();
    e.stopPropagation();

    const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
      bubbles: true,
      composed: true,
      detail: { programBodyUpdated: true },
    });
    this.dispatchEvent(event);
  }

  handleAddNewStatement(e: Event) {
    let target = e.currentTarget as HTMLButtonElement;
    this.addNewStatement(target.value);
    this.hideAddNewStatementDialog();
    if (this.language.deviceList) {
      this.selectedDevice = this.language.deviceList[0];
    }
  }

  handleShowAddNewStatementDialog() {
    this.addStatementModalRef.value.showModal();
  }

  handleToggleAddNewStatementOptionsVisibility() {
    this.addStatementOptionsVisible = !this.addStatementOptionsVisible;
  }

  handleAddStatementFilter(e: Event) {
    this.addStatementOptionsFilter = (e.currentTarget as HTMLInputElement).value;
  }

  handleRenderBasicStatements() {
    if (!this.renderBasicStatements) {
      this.renderBasicStatements = true;
      this.addStatementOptionsFilter = '';
    }
  }

  handleRenderDeviceStatements() {
    if (this.renderBasicStatements) {
      this.renderBasicStatements = false;
      this.addStatementOptionsFilter = '';
    }
  }

  handleSelectedDeviceChange(e: Event) {
    this.selectedDevice = (e.currentTarget as HTMLInputElement).value;
  }

  handleStatementClick(stmt: ProgramStatement) {
    if (this.editorMode === 'skeletonize') {
      const isSelected = this.selectedStatements.includes(stmt);
      
      if (isSelected) {
        // If unselecting a block, unselect it and all dependent blocks
        this.unselectBlockAndDependents(stmt);
      } else {
        // If selecting a block, select it and all blocks it depends on
        if (this.canSelectStatement(stmt)) {
          this.selectBlockAndDependencies(stmt);
        }
      }
      
      // Dispatch selection change event
      const event = new CustomEvent(graphicalEditorCustomEvent.STATEMENT_SELECTION_CHANGED, {
        detail: { selectedStatements: this.selectedStatements },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
      
      this.requestUpdate();
    }
  }

  selectBlockAndDependencies(stmt: ProgramStatement) {
    // First select the block itself if not already selected
    if (!this.selectedStatements.includes(stmt)) {
      this.selectedStatements.push(stmt);
    }

    const stmtDef = this.language.statements[stmt.id];
    const stmtIndex = this.block.indexOf(stmt);
    
    // If the statement has predecessors, select them first
    if (stmtDef.predecessors) {
      let currentIndex = stmtIndex - 1;
      while (currentIndex >= 0) {
        const currentStmt = this.block[currentIndex];
        if (stmtDef.predecessors.includes(currentStmt.id)) {
          this.selectBlockAndDependencies(currentStmt);
        }
        currentIndex--;
      }
    }
    
    // If the statement has parents, select them
    if (stmtDef.parents) {
      let currentIndex = stmtIndex - 1;
      while (currentIndex >= 0) {
        const currentStmt = this.block[currentIndex];
        if (stmtDef.parents.includes(currentStmt.id)) {
          this.selectBlockAndDependencies(currentStmt);
        }
        currentIndex--;
      }
    }
  }

  unselectBlockAndDependents(stmt: ProgramStatement) {
    // First unselect the block itself
    this.selectedStatements = this.selectedStatements.filter(s => s !== stmt);
    
    const stmtDef = this.language.statements[stmt.id];
    const stmtIndex = this.block.indexOf(stmt);
    
    // If the statement has successors, unselect them
    if (stmtDef.successors) {
      let currentIndex = stmtIndex + 1;
      while (currentIndex < this.block.length) {
        const currentStmt = this.block[currentIndex];
        if (stmtDef.successors.includes(currentStmt.id)) {
          this.unselectBlockAndDependents(currentStmt);
        }
        currentIndex++;
      }
    }
    
    // Unselect any blocks that depend on this block
    for (let i = stmtIndex + 1; i < this.block.length; i++) {
      const dependentStmt = this.block[i];
      const dependentDef = this.language.statements[dependentStmt.id];
      
      // If this block is required by the dependent block
      if (dependentDef.predecessors?.includes(stmt.id) || 
          dependentDef.parents?.includes(stmt.id)) {
        this.unselectBlockAndDependents(dependentStmt);
      }
    }
  }

  canSelectStatement(stmt: ProgramStatement): boolean {
    // Check if the statement can be selected based on dependencies
    const stmtDef = this.language.statements[stmt.id];
    const stmtIndex = this.block.indexOf(stmt);
    
    // If the statement has predecessors or parents, check if they are selected
    if (stmtDef.predecessors || stmtDef.parents) {
      let hasRequiredBlocksSelected = true;
      
      // Check predecessors
      if (stmtDef.predecessors) {
        for (let i = 0; i < stmtIndex; i++) {
          const prevStmt = this.block[i];
          if (stmtDef.predecessors.includes(prevStmt.id) && 
              !this.selectedStatements.includes(prevStmt)) {
            hasRequiredBlocksSelected = false;
            break;
          }
        }
      }
      
      // Check parents
      if (stmtDef.parents) {
        for (let i = 0; i < stmtIndex; i++) {
          const prevStmt = this.block[i];
          if (stmtDef.parents.includes(prevStmt.id) && 
              !this.selectedStatements.includes(prevStmt)) {
            hasRequiredBlocksSelected = false;
            break;
          }
        }
      }
      
      return hasRequiredBlocksSelected;
    }
    
    return true;
  }
  //#endregion

  //#region Templates
  addStatementButtonTemplate() {
    return html`
      <editor-button
        @click="${this.handleShowAddNewStatementDialog}"
        title="Add Statement"
        class="add-new-statement-btn">
        <editor-icon .icon="${icons['plusLg']}"></editor-icon>
      </editor-button>
    `;
  }

  statementsTemplate() {
    return html`
      ${this.block.map((stmt, index) => html`
        <ge-statement
          .statement="${stmt}"
          .isSelected="${this.editorMode === 'skeletonize' && this.selectedStatements.includes(stmt)}"
          @statement-click=${(e: CustomEvent) => this.handleStatementClick(e.detail.statement)}
        ></ge-statement>
      `)}
    `;
  }

  addStatementOptionTemplate(stmtKey: string) {
    return html`
      <editor-button
        .value="${stmtKey}"
        @click="${this.handleAddNewStatement}"
        .title="${stmtKey}"
        class="add-statament-option-button"
        style="${`color: ${this.language.statements[stmtKey].foregroundColor}; background-color: ${this.language.statements[stmtKey].backgroundColor}`}">
        <editor-icon .icon="${icons[this.language.statements[stmtKey].icon]}"></editor-icon>
        <span>${this.language.statements[stmtKey].label}</span>
      </editor-button>
    `;
  }

  addStatementOptionsTemplate() {
    return html`
      <div class="add-statement-options">
        ${Object.keys(this.filteredAddStatementOptions).length
          ? Object.keys(this.filteredAddStatementOptions).map((stmtKey) => {
              if (!(this.language.statements[stmtKey] as DeviceStatement).deviceName) {
                return this.addStatementOptionTemplate(stmtKey);
              }
            })
          : html`<div class="no-available-statements">No available statements</div>`}
      </div>
    `;
  }

  deviceStatementsTemplate() {
    return html`
      ${this.devicesTemplate()}
      <div class="add-statement-options">
        ${Object.keys(this.filteredAddStatementOptions).length > 0
          ? Object.keys(this.filteredAddStatementOptions).map((stmtKey) => {
              return (this.language.statements[stmtKey] as DeviceStatement).deviceName === this.selectedDevice
                ? this.addStatementOptionTemplate(stmtKey)
                : nothing;
            })
          : html`<div class="no-available-statements">No available device statements</div>`}
      </div>
    `;
  }

  basicStatementsTemplate() {
    return html`${this.addStatementOptionsVisible ? this.addStatementOptionsTemplate() : nothing}`;
  }

  devicesTemplate() {
    return html`
      <div class="device-select-wrapper">
        <label for="device-select" class="device-select-label">Device</label>
        <select id="device-select" .value=${this.selectedDevice} @change="${this.handleSelectedDeviceChange}">
          ${this.language.deviceList.map((deviceName) => {
            return html` <option value="${deviceName}">${deviceName}</option> `;
          })}
        </select>
      </div>
    `;
  }

  addStatementModalTemplate() {
    return html`
      <editor-modal ${ref(this.addStatementModalRef)} .modalTitle="${'Add New Statement'}" class="add-statement-modal">
        <div class="add-statement-dialog-content-wrapper">
          <div class="add-statement-search-wrapper">
            <div class="add-statement-search-input-wrapper">
              <input
                type="text"
                placeholder="Search"
                .value="${this.addStatementOptionsFilter}"
                @input="${this.handleAddStatementFilter}"
                class="add-statement-search-field" />
            </div>
            <div class="add-statement-tabs">
              <editor-button
                class="statement-type-button basic-statement-button"
                @click="${this.handleRenderBasicStatements}"
                style="${this.renderBasicStatements
                  ? 'border-bottom: 2px solid var(--blue-500)'
                  : 'border-bottom: 2px solid white'}"
                >Basic statements</editor-button
              >
              <editor-button
                class="statement-type-button"
                @click="${this.handleRenderDeviceStatements}"
                style="${!this.renderBasicStatements
                  ? 'border-bottom: 2px solid var(--blue-500)'
                  : 'border-bottom: 2px solid white'}"
                >Device statements</editor-button
              >
            </div>
          </div>
          <div class="add-statements-wrapper">
            ${this.renderBasicStatements ? this.basicStatementsTemplate() : this.deviceStatementsTemplate()}
          </div>
        </div>
      </editor-modal>
    `;
  }
  //#endregion

  //#region Render
  render() {
    return html`
      ${this.isExample
        ? html`${this.statementsTemplate()}`
        : html`${this.statementsTemplate()} ${this.addStatementButtonTemplate()} ${this.addStatementModalTemplate()}`}
    `;
  }
  //#endregion
}
