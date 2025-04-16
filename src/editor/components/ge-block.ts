import { consume } from '@lit/context';
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { languageContext, programContext } from '@/editor/context/editor-context';
import { Block, Program, ProgramStatement, getBlockDependencies, getBlockDependents, CompoundStatement } from '@/vpl/program';
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

      .highlighted {
        border: 2px solid var(--blue-500);
        background-color: var(--blue-100);
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
  @property() selectedStatements: Set<string> = new Set();
  @property({ type: Boolean }) skeletonizeMode: boolean = false;
  @property() editorMode: EditorMode = 'normal';
  @property() selectedStatements: ProgramStatement[] = [];
  //#endregion

  //#region Refs
  addStatementModalRef: Ref<EditorModal> = createRef();
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
      this.editorMode = e.detail.mode;
      if (this.editorMode === 'normal') {
        this.selectedStatements = [];
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
    if (this.skeletonizeMode) {
      e.stopPropagation();
      return; // Disable interaction when skeletonize mode is active
    }
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
    if (this.skeletonizeMode) {
      e.stopPropagation();
      return; // Disable interaction when skeletonize mode is active
    }
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
    if (this.skeletonizeMode) {
      e.stopPropagation();
      return; // Disable interaction when skeletonize mode is active
    }
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

  toggleStatementSelection(stmtUuid: string) {
    if (!this.skeletonizeMode) return;

    const stmt = this.block.find((s) => s._uuid === stmtUuid);
    if (!stmt) return;

    if (this.program.header.skeletonize.some((s) => s._uuid === stmtUuid)) {
      // Remove the statement from skeletonize
      this.program.header.skeletonize = this.program.header.skeletonize.filter((s) => s._uuid !== stmtUuid);
      this.selectedStatements.delete(stmtUuid);
    } else {
      // Add the statement to skeletonize
      this.program.header.skeletonize.push(stmt);
      this.selectedStatements.add(stmtUuid);

      // Reorder skeletonize to maintain relative order based on index in the editor
      this.program.header.skeletonize.sort((a, b) => {
        const indexA = this.block.findIndex((s) => s._uuid === a._uuid);
        const indexB = this.block.findIndex((s) => s._uuid === b._uuid);
        return indexA - indexB;
      });
    }

    this.requestUpdate();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('skeletonizeMode') && !this.skeletonizeMode) {
      this.selectedStatements.clear();
      this.requestUpdate();
    }
  }
  handleStatementClick(stmt: ProgramStatement) {
    if (this.editorMode === 'skeletonize') {
      const isSelected = this.selectedStatements.includes(stmt);
      
      if (isSelected) {
        // If unselecting a parent block, unselect all children and related blocks
        if (this.isParentBlock(stmt)) {
          this.unselectBlockAndChildren(stmt);
        } else {
          this.selectedStatements = this.selectedStatements.filter(s => s !== stmt);
          // Also unselect related blocks
          this.unselectRelatedBlocks(stmt);
        }
      } else {
        // If selecting a block, select all its children and related blocks
        if (this.canSelectStatement(stmt)) {
          this.selectBlockAndChildren(stmt);
          // Also select related blocks
          this.selectRelatedBlocks(stmt);
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

  selectRelatedBlocks(stmt: ProgramStatement) {
    const stmtDef = this.language.statements[stmt.id];
    
    // Find all related blocks in the same level
    const stmtIndex = this.block.indexOf(stmt);
    
    // If the statement has predecessors, select them
    if (stmtDef.predecessors) {
      let currentIndex = stmtIndex;
      while (currentIndex >= 0) {
        if (stmtDef.predecessors.includes(this.block[currentIndex].id)) {
          this.selectBlockAndChildren(this.block[currentIndex]);
        }
        currentIndex--;
      }
    }
    
    // If the statement has successors, select them
    if (stmtDef.successors) {
      let currentIndex = stmtIndex + 1;
      while (currentIndex < this.block.length) {
        if (stmtDef.successors.includes(this.block[currentIndex].id)) {
          this.selectBlockAndChildren(this.block[currentIndex]);
        } else {
          break;
        }
        currentIndex++;
      }
    }
    
    // If the statement has parents, select them
    if (stmtDef.parents) {
      let currentIndex = stmtIndex;
      while (currentIndex >= 0) {
        if (stmtDef.parents.includes(this.block[currentIndex].id)) {
          this.selectBlockAndChildren(this.block[currentIndex]);
        }
        currentIndex--;
      }
    }
  }

  unselectRelatedBlocks(stmt: ProgramStatement) {
    const stmtDef = this.language.statements[stmt.id];
    
    // Find all related blocks in the same level
    const stmtIndex = this.block.indexOf(stmt);
    
    // If the statement has predecessors, unselect them
    if (stmtDef.predecessors) {
      let currentIndex = stmtIndex;
      while (currentIndex >= 0) {
        if (stmtDef.predecessors.includes(this.block[currentIndex].id)) {
          this.unselectBlockAndChildren(this.block[currentIndex]);
        }
        currentIndex--;
      }
    }
    
    // If the statement has successors, unselect them
    if (stmtDef.successors) {
      let currentIndex = stmtIndex + 1;
      while (currentIndex < this.block.length) {
        if (stmtDef.successors.includes(this.block[currentIndex].id)) {
          this.unselectBlockAndChildren(this.block[currentIndex]);
        } else {
          break;
        }
        currentIndex++;
      }
    }
    
    // If the statement has parents, unselect them
    if (stmtDef.parents) {
      let currentIndex = stmtIndex;
      while (currentIndex >= 0) {
        if (stmtDef.parents.includes(this.block[currentIndex].id)) {
          this.unselectBlockAndChildren(this.block[currentIndex]);
        }
        currentIndex--;
      }
    }
  }

  isParentBlock(stmt: ProgramStatement): boolean {
    return stmt.id === 'unit' && 'value' in stmt && typeof stmt.value === 'string' && stmt.value in this.program.header.userProcedures;
  }

  selectBlockAndChildren(stmt: ProgramStatement) {
    this.selectedStatements.push(stmt);
    if (this.isParentBlock(stmt) && 'value' in stmt && typeof stmt.value === 'string') {
      const childBlock = this.program.header.userProcedures[stmt.value];
      childBlock.forEach(childStmt => this.selectBlockAndChildren(childStmt));
    }
  }

  unselectBlockAndChildren(stmt: ProgramStatement) {
    // First unselect the current statement
    this.selectedStatements = this.selectedStatements.filter(s => s !== stmt);
    
    // If it's a parent block, unselect all children
    if (this.isParentBlock(stmt) && 'value' in stmt && typeof stmt.value === 'string') {
      const childBlock = this.program.header.userProcedures[stmt.value];
      childBlock.forEach(childStmt => this.unselectBlockAndChildren(childStmt));
    }

    // Find and unselect all blocks that depend on this block
    this.block.forEach((dependentStmt, index) => {
      const dependentDef = this.language.statements[dependentStmt.id];
      
      // If this block is a parent of the dependent block
      if (dependentDef.parents?.includes(stmt.id)) {
        this.unselectBlockAndChildren(dependentStmt);
      }
      
      // If this block is a predecessor of the dependent block
      if (dependentDef.predecessors?.includes(stmt.id)) {
        this.unselectBlockAndChildren(dependentStmt);
      }
      
      // If this block is a successor of the dependent block
      if (dependentDef.successors?.includes(stmt.id)) {
        this.unselectBlockAndChildren(dependentStmt);
      }
    });
  }

  canSelectStatement(stmt: ProgramStatement): boolean {
    return !this.isParentBlock(stmt) || this.selectedStatements.length === 0;
  }
  //#endregion

  //#region Templates
  addStatementButtonTemplate() {
    return html`
      ${!this.skeletonizeMode
        ? html`
            <editor-button
              @click="${this.handleShowAddNewStatementDialog}"
              title="Add Statement"
              class="add-new-statement-btn">
              <editor-icon .icon="${icons['plusLg']}"></editor-icon>
            </editor-button>
          `
        : nothing}
    `;
  }

  statementsTemplate() {
    return html`
      ${repeat(
        this.block,
        (stmt) => stmt._uuid,
        (stmt, i) =>
          html`
            <ge-statement
              .isProcBody="${this.isProcBody}"
              .statement="${stmt}"
              .index="${i}"
              .isExample="${this.isExample}"
              .skeletonizeMode="${this.skeletonizeMode}"
              .selectedStatements="${this.selectedStatements}"
              .toggleStatementSelection="${this.toggleStatementSelection.bind(this)}"
              class="${this.skeletonizeMode && this.selectedStatements.has(stmt._uuid) ? 'highlighted' : ''}"
              style="${this.skeletonizeMode && this.selectedStatements.has(stmt._uuid) ? 'outline: 2px solid yellow;' : ''}">
            </ge-statement>
          `
      )}
      ${this.block.map((stmt, index) => html`
        <ge-statement
          .statement="${stmt}"
          .isSelected="${this.selectedStatements.includes(stmt)}"
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
        ${Object.keys(this.filteredAddStatementOptions).length > 0
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
          : html`<div class="no-available-device-statements">No available device statements</div>`}
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

  render() {
    return html`
      ${this.isExample
        ? html`${this.statementsTemplate()}`
        : html`${this.statementsTemplate()} ${this.addStatementButtonTemplate()} ${this.addStatementModalTemplate()}`}
    `;
  }
  //#endregion
}
