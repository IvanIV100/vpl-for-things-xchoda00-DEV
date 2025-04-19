import { consume } from '@lit/context';
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { languageContext, programContext } from '@/editor/context/editor-context';
import { Block, Program, ProgramStatement, CompoundStatement, AbstractStatementWithArgs, assignUuidToBlock, DeviceMetadata, MetadataInit, initDefaultArgumentType } from '@/vpl/program';
import { graphicalEditorCustomEvent, statementCustomEvent } from '@/editor/editor-custom-events';
import {
  CompoundLanguageStatement,
  CompoundLanguageStatementWithArgs,
  DeviceStatement,
  EditorModal,
  Language,
  UnitLanguageStatementWithArgs,
} from '@/index';
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

      .highlight-active {
        box-shadow: 0 0 10px 2px rgba(255, 255, 0, 0.8); /* Highlight effect */
        border: 2px solid rgba(255, 255, 0, 0.8);
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

      /* Device Selection Modal Styles */
      .device-selection-modal-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 500px;
        color: black;
        padding: 0;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
      }

      /* Style for the dialog element to control width */
      .device-selection-modal dialog {
        width: 75%;
        min-width: 400px;
        height: 600px;
        max-height: 600px;
        box-sizing: border-box;
        min-height: 600px;
      }

      /* Fix the width of the search input container */
      .search-container {
        width: 100%;
        box-sizing: border-box;
      }

      .device-search-input {
        width: 100%;
        padding: 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid var(--gray-500);
        font-family: var(--main-font);
        margin-bottom: 0.75rem;
        background-color: white;
        color: black;
        font-size: 1rem;
        box-sizing: border-box;
      }

      .device-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .device-section-header {
        font-size: 1.25rem;
        font-weight: bold;
        color: black;
        margin-bottom: 0.25rem;
      }

      .device-section-divider {
        height: 1px;
        background-color: var(--gray-500);
        margin: 0.25rem 0;
      }

      .device-buttons-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-left: 0.5rem;
        overflow-y: auto;
      }

      .no-devices-message {
        color: var(--gray-700);
        text-align: center;
        padding: 1rem 0;
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
  @property({ type: Boolean }) restrainedMode: boolean = false;
  @property({ type: Boolean }) isHighlighted: boolean = false;
  @property() filteredDeviceStatements: string[] = [];
  @property() deviceSearchInput: string = '';
  @property() recommendedDeviceStatements: string[] = [];
  @property() otherDeviceStatements: string[] = [];
  @property() tmpUUID :string = '';
  @property() parentProcedureUuid: string; // Add property to store the UUID
  @property() clickedBlockDeviceInit: string='';
  @property() editorMode: 'edit' | 'initialize' = 'edit'; // Mode for the editor: edit or initialize
  //#endregion

  //#region Refs
  addStatementModalRef: Ref<EditorModal> = createRef();
  deviceSelectionModalRef: Ref<EditorModal> = createRef();
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
      if(stmt.key === 'deviceType'){
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
    const newStatement = {
      type: this.language.statements[stmtKey].type,
      key: stmtKey,
      arguments: (this.language.statements[stmtKey] as UnitLanguageStatementWithArgs | CompoundLanguageStatementWithArgs)
        .arguments,
    };

    this.program.addStatement(this.block, newStatement);

    if (this.language.statements[stmtKey].isUserProcedure) {
      const addedStmt = this.block[this.block.length - 1];
      const userProcedureBlock = this.program.header.userProcedures[stmtKey];
      assignUuidToBlock(userProcedureBlock);

      const devices: DeviceMetadata[] = [];
      const parseBlockForDevices = (block: Block) => {
        block.forEach((stmt) => {
          const deviceName = stmt.id.split('.')[0];
          const isDeviceStatement = stmt.id === 'deviceType' || this.language.deviceList.includes(deviceName);

          if (isDeviceStatement) {
            if (stmt.id === 'deviceType' && (stmt as AbstractStatementWithArgs).arguments?.[0]) {
              const arg = (stmt as AbstractStatementWithArgs).arguments[0];
              devices.push({
                uuid: stmt._uuid,
                deviceId: String(arg.value),
                statement: stmt,
                value: undefined
              });
            } else if (this.language.deviceList.includes(deviceName)) {
              const deviceStatement = {
                ...stmt,
                arguments: []
              };
              const langStatement = this.language.statements[stmt.id];
              if (langStatement && (langStatement as UnitLanguageStatementWithArgs).arguments) {
                const argDefs = (langStatement as UnitLanguageStatementWithArgs).arguments;

                argDefs.forEach((argDef, index) => {
                  const newArg = {
                    type: argDef.type,
                    value: null
                  };

                  if (argDef.type === 'str_opt' || argDef.type === 'num_opt') {
                    newArg.value = argDef.options[0].id;
                  } else {
                    newArg.value = initDefaultArgumentType(argDef.type);
                  }
                  if ((stmt as AbstractStatementWithArgs).arguments &&
                      (stmt as AbstractStatementWithArgs).arguments[index]) {
                    newArg.value = (stmt as AbstractStatementWithArgs).arguments[index].value;
                  }
                  deviceStatement.arguments.push(newArg);
                });
              }

              devices.push({
                uuid: stmt._uuid,
                deviceId: stmt.id,
                statement: deviceStatement,
                value: undefined
              });
            }
          }
          if ((stmt as CompoundStatement).block) {
            parseBlockForDevices((stmt as CompoundStatement).block);
          }
        });
      };
      parseBlockForDevices(userProcedureBlock);

      const newEntry: MetadataInit = {
        uuid: addedStmt._uuid,
        id: stmtKey,
        devices: devices,
      };
      this.program.header.initializedProcedures.push(newEntry);
    }

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
      return;
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
      return;
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
      return;
    }
    let statementIndex = e.detail.index;
    const stmtToRemove = this.block[statementIndex];

    if (this.language.statements[stmtToRemove.id]?.isUserProcedure) {
      this.program.header.initializedProcedures = this.program.header.initializedProcedures.filter(
        (entry) => entry.uuid !== stmtToRemove._uuid
      );
    }

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

  toggleStatementSelection(stmtUuid: string, isParentClick: boolean = false) {
    const clickedBlock = this.block.find((s) => s._uuid === stmtUuid);

    if (clickedBlock) {
      const deviceName = clickedBlock?.id.split('.')[0];
      var isDevice = false;
      if (this.language.deviceList.includes(deviceName)) { isDevice = true; }

      if ((clickedBlock.id === 'deviceType' || isDevice) && this.editorMode === 'initialize' && isParentClick) {
        this.clickedBlockDeviceInit = stmtUuid;
        if (clickedBlock._uuid !== undefined) {
          this.showDeviceSelectionModal(clickedBlock);
          return;
        }
      }
    }
    if (!this.skeletonizeMode) {
      return;
    }

    const stmt = this.block.find((s) => s._uuid === stmtUuid);
    const addedUuids: string[] = [];
    const removedUuids: string[] = [];


    const propagateSelection = (stmt: ProgramStatement, isSelected: boolean) => {
      const isInvalid = stmt.isInvalid;
      if (!isInvalid) {
        if (isSelected) {
          if (!this.selectedStatements.has(stmt._uuid)) {
            this.selectedStatements.add(stmt._uuid);
            this.program.header.skeletonize_uuid.push(stmt._uuid);
            addedUuids.push(stmt._uuid);
          }
        } else {
          if (this.selectedStatements.has(stmt._uuid)) {
            this.selectedStatements.delete(stmt._uuid);
            this.program.header.skeletonize_uuid = this.program.header.skeletonize_uuid.filter(
              (uuid) => uuid !== stmt._uuid
            );
            removedUuids.push(stmt._uuid);
          }
        }
      }

      if ((stmt as CompoundStatement).block) {
        (stmt as CompoundStatement).block.forEach((childStmt) => propagateSelection(childStmt, isSelected));
      }
    };

    const isSelected = !this.selectedStatements.has(stmtUuid);
    propagateSelection(stmt, isSelected);

    const highlightEvent = new CustomEvent('update-highlight-state', {
      bubbles: true,
      composed: true,
      detail: {
        skeletonizeUuids: this.program.header.skeletonize_uuid,
        forceUpdate: true
      }
    });
    this.dispatchEvent(highlightEvent);

    const updateNestedBlocks = (element: Element) => {
      if (element.shadowRoot) {
        const statements = element.shadowRoot.querySelectorAll('ge-statement');
        statements.forEach(stmt => {
          const uuid = stmt.getAttribute('uuid');
          if (uuid && this.program.header.skeletonize_uuid.includes(uuid)) {
            (stmt as any).isHighlighted = true;
            updateNestedBlocks(stmt);
          }
        });
      }
    };

    updateNestedBlocks(document.documentElement);

    const programEvent = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
      bubbles: true,
      composed: true,
      detail: { skeletonizeUpdated: true }
    });
    this.dispatchEvent(programEvent);

    this.requestUpdate();
  }


  showDeviceSelectionModal(clickedBlock: ProgramStatement) {
    this.clickedBlockDeviceInit = clickedBlock._uuid;
    this.deviceSearchInput = '';

    // Get all device statements
    const allDeviceStatements = Object.keys(this.language.statements).filter((stmtKey) => {
      const statement = this.language.statements[stmtKey];
      return statement.group !== 'logic' && statement.group !== 'loop' && statement.group !== 'variable' && statement.group !== 'misc' && statement.group !== 'internal'
        && statement.label !== 'Send Notification' && statement.label !== 'DeviceType';
    });

    // Find the device type of the clicked block if it's a deviceType statement
    let selectedDeviceType = '';
    if (clickedBlock.id === 'deviceType' && (clickedBlock as AbstractStatementWithArgs).arguments?.[0]) {
      selectedDeviceType = String((clickedBlock as AbstractStatementWithArgs).arguments[0].value);
    }

    // Categorize devices into recommended and other based on device type
    this.categorizeDeviceStatements(allDeviceStatements, selectedDeviceType);

    // Set filtered statements to all statements initially
    this.filteredDeviceStatements = allDeviceStatements;

    this.deviceSelectionModalRef.value.showModal();
  }

  categorizeDeviceStatements(deviceStatements: string[], selectedDeviceType: string) {
    this.recommendedDeviceStatements = [];
    this.otherDeviceStatements = [];

    deviceStatements.forEach(stmtKey => {
      const deviceName = stmtKey.split('.')[0];
      const deviceType = this.language.deviceListWithTypes[deviceName];

      if (deviceType === selectedDeviceType && selectedDeviceType !== '') {
        this.recommendedDeviceStatements.push(stmtKey);
      } else {
        this.otherDeviceStatements.push(stmtKey);
      }
    });
  }

  handleDeviceSearchInput(e: Event) {
    this.deviceSearchInput = (e.currentTarget as HTMLInputElement).value;
    const searchTerm = this.deviceSearchInput.toLowerCase();

    // Filter all device statements based on search input
    const allDeviceStatements = Object.keys(this.language.statements).filter((stmtKey) => {
      const statement = this.language.statements[stmtKey];
      return statement.group !== 'logic' && statement.group !== 'loop' && statement.group !== 'variable' && statement.group !== 'misc' && statement.group !== 'internal'
        && statement.label !== 'Send Notification' && statement.label !== 'DeviceType';
    });

    // Filter based on search term
    if (searchTerm) {
      this.filteredDeviceStatements = allDeviceStatements.filter(stmtKey => {
        const statement = this.language.statements[stmtKey];
        return statement.label.toLowerCase().includes(searchTerm);
      });
    } else {
      this.filteredDeviceStatements = allDeviceStatements;
    }

    // Find the device type of the clicked block if it's a deviceType statement
    const clickedBlock = this.block.find((stmt) => stmt._uuid === this.clickedBlockDeviceInit);
    let selectedDeviceType = '';
    if (clickedBlock && clickedBlock.id === 'deviceType' && (clickedBlock as AbstractStatementWithArgs).arguments?.[0]) {
      selectedDeviceType = String((clickedBlock as AbstractStatementWithArgs).arguments[0].value);
    }

    // Recategorize filtered statements
    this.categorizeDeviceStatements(this.filteredDeviceStatements, selectedDeviceType);
  }


  handleDeviceStatementSelected(stmtKey: string) {
    this.deviceSelectionModalRef.value.hideModal();

    const clickedBlock = this.block.find((stmt) => stmt._uuid === this.clickedBlockDeviceInit);
    if (clickedBlock) {
      const selectedStatement = {
        ...this.language.statements[stmtKey],
        id: stmtKey,
        _uuid: clickedBlock._uuid,
      };
      const index = this.block.indexOf(clickedBlock);
      if (index !== -1) {
        this.block[index] = selectedStatement;

        this.requestUpdate();
        const deviceSelectionEvent = new CustomEvent('device-selection-changed', {
          bubbles: true,
          composed: true,
          detail: {
            deviceUuid: clickedBlock._uuid,
            procedureUuid: this.tmpUUID,
            selectedDeviceId: stmtKey
          }
        });
        this.dispatchEvent(deviceSelectionEvent);

        const metadataEntry = this.program.header.initializedProcedures.find(
          (entry) => entry.uuid === this.tmpUUID
        );

        if (metadataEntry) {
          const deviceEntry = metadataEntry.devices.find(device => device.uuid === clickedBlock._uuid);
          if (deviceEntry) {
            deviceEntry.deviceId = stmtKey;
            const langStatement = this.language.statements[stmtKey];

            deviceEntry.statement = {
              ...selectedStatement,
              arguments: []
            };

            if (langStatement && (langStatement as UnitLanguageStatementWithArgs).arguments) {
              const argDefs = (langStatement as UnitLanguageStatementWithArgs).arguments;
              argDefs.forEach(argDef => {
                const newArg = {
                  type: argDef.type,
                  value: null
                };
                if (argDef.type === 'str_opt' || argDef.type === 'num_opt') {
                  newArg.value = argDef.options[0].id;
                } else {
                  newArg.value = initDefaultArgumentType(argDef.type);
                }

                (deviceEntry.statement as AbstractStatementWithArgs).arguments.push(newArg);
              });
            }

            if (deviceEntry.value) {
              deviceEntry.value = undefined;
            }
          } else {
            console.warn(`No device metadata entry found for UUID: ${clickedBlock._uuid}`);
          }
        } else {
          console.warn(`No metadata entry found for UUID: ${this.tmpUUID}`);
        }

        this.requestUpdate();
        const event = new CustomEvent(graphicalEditorCustomEvent.PROGRAM_UPDATED, {
          bubbles: true,
          composed: true,
          detail: { programBodyUpdated: true },
        });
        this.dispatchEvent(event);
      } else {
        console.warn(`Clicked block not found in the block array.`);
      }
    }
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('skeletonizeMode') && !this.skeletonizeMode) {
      this.selectedStatements.clear();

      const event = new CustomEvent('skeletonize-selection-changed', {
        bubbles: true,
        composed: true,
        detail: { skeletonizeUuids: this.program.header.skeletonize_uuid }
      });
      this.dispatchEvent(event);

      this.requestUpdate();
    }
  }
  //#endregion

  //#region Templates
  addStatementButtonTemplate() {
    return html`
      ${!this.skeletonizeMode && !(this.editorMode === 'initialize' && this.restrainedMode)
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
              .statement="${stmt}"
              .index="${i}"
              .isProcBody="${this.isProcBody}"
              .isExample="${this.isExample}"
              .skeletonizeMode="${this.skeletonizeMode}"
              .restrainedMode="${this.restrainedMode || (this.editorMode === 'initialize')}"
              .isSelected="${this.selectedStatements.has(stmt._uuid)}"
              .isHighlighted="${this.program.header.skeletonize_uuid.includes(stmt._uuid)}"
              .uuidMetadata="${this.tmpUUID}"
              .editorMode="${this.editorMode}"
              @click="${(e: Event) => {
                e.stopPropagation();
                console.log(`Block clicked: UUID ${stmt._uuid}`);
                this.toggleStatementSelection(stmt._uuid, true);
              }}"
              @nested-click="${(e: CustomEvent) => {
                e.stopPropagation();
                console.log(`Nested block clicked: UUID ${e.detail.uuid}`);
                this.toggleStatementSelection(e.detail.uuid, false);
              }}">
            </ge-statement>
          `
      )}
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
                  : 'border-bottom: 2px solid white'}">
                Basic statements
              </editor-button>
              <editor-button
                class="statement-type-button"
                @click="${this.handleRenderDeviceStatements}"
                style="${!this.renderBasicStatements
                  ? 'border-bottom: 2px solid var(--blue-500)'
                  : 'border-bottom: 2px solid white'}">
                Device statements
              </editor-button>
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
      <editor-modal ${ref(this.deviceSelectionModalRef)} .modalTitle="${'Select Device Statement'}" class="device-selection-modal">
        <div class="device-selection-modal-content">
          <div style="padding: 1rem; height: 500px; overflow-y: auto;">
            <!-- Search bar -->
            <div class="search-container">
              <input
                type="text"
                placeholder="Search"
                class="device-search-input"
                .value="${this.deviceSearchInput}"
                @input="${this.handleDeviceSearchInput}" />
            </div>

            <!-- Recommended section -->
            ${this.recommendedDeviceStatements.length > 0 ? html`
              <div class="device-section">
                <div class="device-section-header">Recomended</div>
                <div class="device-section-divider"></div>
                <div class="device-buttons-container">
                  ${this.recommendedDeviceStatements.map((stmtKey) => {
                    const statement = this.language.statements[stmtKey];
                    return html`
                      <editor-button
                        @click="${() => this.handleDeviceStatementSelected(stmtKey)}"
                        style="color: ${statement.foregroundColor}; background-color: ${statement.backgroundColor};">
                        <editor-icon .icon="${icons[statement.icon]}"></editor-icon>
                        <span>${statement.label}</span>
                      </editor-button>
                    `;
                  })}
                </div>
              </div>
            ` : nothing}

            <!-- Other section -->
            ${this.otherDeviceStatements.length > 0 ? html`
              <div class="device-section">
                <div class="device-section-header">Other</div>
                <div class="device-section-divider"></div>
                <div class="device-buttons-container">
                  ${this.otherDeviceStatements.map((stmtKey) => {
                    const statement = this.language.statements[stmtKey];
                    return html`
                      <editor-button
                        @click="${() => this.handleDeviceStatementSelected(stmtKey)}"
                        style="color: ${statement.foregroundColor}; background-color: ${statement.backgroundColor};">
                        <editor-icon .icon="${icons[statement.icon]}"></editor-icon>
                        <span>${statement.label}</span>
                      </editor-button>
                    `;
                  })}
                </div>
              </div>
            ` : nothing}

            ${this.filteredDeviceStatements.length === 0 ? html`
              <div class="no-devices-message">No matching devices found</div>
            ` : nothing}
          </div>
        </div>
      </editor-modal>
    `;
  }
  //#endregion
}
