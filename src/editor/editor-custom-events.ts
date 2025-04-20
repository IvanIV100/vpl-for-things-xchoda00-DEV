export const statementCustomEvent = {
  REMOVE: 'statement-remove',
  MOVE_UP: 'statement-move-up',
  MOVE_DOWN: 'statement-move-down',
} as const;

export const modalCustomEvent = {
  CLOSE: 'modal-close',
} as const;

export const textEditorCustomEvent = {
  PROGRAM_UPDATED: 'text-editor-program-updated',
} as const;

export const graphicalEditorCustomEvent = {
  PROGRAM_UPDATED: 'ge-program-updated',
} as const;

export const expressionListCustomEvent = {
  ADD_EXPR_ARG: 'el-add-expr-arg',
  SHOW_GROUP_BUTTONS: 'el-show-group-buttons',
  HIDE_GROUP_BUTTONS: 'el-hide-group-buttons',
  SELECTED_EXPRS_UPDATED: 'el-selected-exprs-updated',
} as const;

export const editorControlsCustomEvent = {
  EDITOR_VIEW_CHANGED: 'ec-view-changed',
} as const;

export const editorExpressionCustomEvent = {
  EXPRESSION_SELECTED: 'e-expression-selected',
  EXPRESSION_HIGHLIGHTED: 'e-expression-highlighted',
  EXPRESSION_ADD_TRIGGERED: 'e-expression-add-triggered',
} as const;

export const editorVariablesModalCustomEvent = {
  VARIABLE_SELECTED: 'e-variable-modal-var-selected',
} as const;

export const editorExpressionOperandCustomEvent = {
  ADD_OPD_MODAL_VISIBLE: 'e-expr-opd-add-opd-modal-visible',
  REMOVE_PARENT_EXPR: 'e-expr-opd-remove-parent-expr',
  CANCEL_ADD_OPD: 'e-expr-opd-cancel-add-opd',
} as const;

export const procedureEditorCustomEvent = {
  PROCEDURE_MODAL_CLOSED: 'procedure-modal-closed',
} as const;

export const deviceMetadataCustomEvent = {
  VALUE_CHANGED: 'device-metadata-value-changed',
  DEVICE_SELECTED: 'device-statement-selected',
  REOPEN_PROCEDURE_MODAL: 'reopen-procedure-modal',
} as const;
