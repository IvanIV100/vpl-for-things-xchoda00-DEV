import { Block } from '..';
import { baseLanguageStatements } from './base.language';
import Types from '@vpl/types.ts';

export class Language {
  variables: Variables;
  statements: Statements;
  deviceList: string[];

  constructor(devices?: Device[]) {
    this.variables = {};
    this.statements = baseLanguageStatements;
    this.deviceList = [];

    if (devices) {
      for (let device of devices) {
        // Converts device attributes to language variables.
        for (let attr of device.attributes) {
          this.variables[`${device.deviceName}.${attr}`] = { type: 'device', label: `${device.deviceName}.${attr}` };
        }

        // Converts device functions to language statements.
        for (let func of device.functions) {
          this.statements[`${device.deviceName}.${func.label}`] = {
            ...func,
            deviceName: device.deviceName,
            label: `${device.deviceName}.${func.label}`,
          };
        }

        // Do not include devices with no functions
        if (device.functions.length > 0) {
          this.deviceList.push(device.deviceName);
        }
      }
    }
  }
}

export type Statements = {
  [id: string]: Statement;
};

export type Statement =
  | UnitLanguageStatement
  | UnitLanguageStatementWithArgs
  | CompoundLanguageStatement
  | CompoundLanguageStatementWithArgs
  | DeviceStatement;

export type Variables = {
  [id: string]: Variable;
};

export type Variable = {
  type: VariableTypes;
  label: string;
};

export type VariableTypes = Types.string | Types.number | Types.boolean | Types.boolean_expression | 'device';

export type LanguageStatementType = 'unit' | 'unit_with_args' | 'compound' | 'compound_with_args';

export type LanguageStatementGroup = 'logic' | 'loop' | 'iot' | 'variable' | 'misc' | 'internal';

export type Icon = keyof typeof import('@/editor/icons');

export type UnitLanguageStatement = {
  type: LanguageStatementType;
  group: LanguageStatementGroup;
  label: string;
  icon: Icon;
  description?: StatementDescription;
  foregroundColor?: string;
  backgroundColor?: string;
  predecessors?: string[];
  successors?: string[];
  parents?: string[];
  isUserProcedure?: boolean;
};

export type StatementDescription = {
  brief: string;
  example?: StatementExample;
};

export type StatementExample = {
  description: string;
  block: Block;
};

export type UnitLanguageStatementWithArgs = UnitLanguageStatement & {
  arguments: Argument[];
};

export type CompoundLanguageStatement = UnitLanguageStatement & {
  nestedStatements?: string[];
};

export type CompoundLanguageStatementWithArgs = UnitLanguageStatementWithArgs & CompoundLanguageStatement;

export type Argument = {
  type: ArgumentType;
  label?: string;
  options?: ArgumentOptions[];
};

export type ArgumentType =
  | Types.string
  | Types.number
  | Types.boolean
  | Types.boolean_expression
  | Types.multi_device
  | 'str_opt'
  | 'num_opt'
  | Types.variable
  | Types.unknown
  | 'device'
  | 'invalid';

export type ArgumentOptions = {
  id: string | number;
  label: string;
};

export type Device = {
  deviceName: string;
  deviceType: string; // Added deviceType property
  attributes: string[];
  functions: (UnitLanguageStatement | UnitLanguageStatementWithArgs)[];
};

export type DeviceStatement = (UnitLanguageStatement | UnitLanguageStatementWithArgs) & {
  deviceName: string;
};
