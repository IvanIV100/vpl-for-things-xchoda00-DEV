import { VariableTypes, ArgumentType, LanguageStatementType, Variable, Argument, Statements } from './language';
import { v4 as uuidv4 } from 'uuid';
import Types from '@vpl/types.ts';

export function parseOperandToString(operand: ExpressionOperand, negated: boolean = false) {
  let valueString =
    operand.type === Types.boolean_expression ? parseExpressionToString(operand.value as Expression) : `${operand.value}`;
  return negated ? `NOT ${valueString}` : valueString;
}

export function parseExpressionToString(expression: Expression) {
  console.log(expression);

  let operandsStrings: string[] = expression.value.map((operand) => {
    if (Array.isArray((operand as Expression).value)) {
      return parseExpressionToString(operand as Expression);
    } else {
      return parseOperandToString(operand as ExpressionOperand, expression.type === '!');
    }
  });

  if (expression.type) {
    return `(${operandsStrings.join(
      ` ${convertOprToDisplayOpr(expression.type as CompareOperator | BoolOperator | NumericOperator)} `
    )})`;
  } else {
    return operandsStrings.join(' ');
  }
}

export function convertOprToDisplayOpr(opr: ExpressionOperator) {
  switch (opr) {
    case '&&':
      return 'AND';
    case '||':
      return 'OR';
    case '!':
      return 'NOT';
    case Types.boolean_expression:
      return "Expression";
    default:
      return opr;
  }
}

export function initDefaultArgumentType(argumentType: ArgumentType) {
  switch (argumentType) {
    case Types.boolean:
      return true;
    case Types.boolean_expression:
      return [] as Expression[];
    case Types.number:
      return 0;
    case Types.string:
      return '';
    case Types.multi_device:
        return [] as Devices[];  
    default:
      return null;
  }
}

export function analyzeBlock(block: Block, langStmts: Statements, parentStmt: ProgramStatement) {
  for (let i = 0; i < block.length; i++) {
    let previousPrgStmt: ProgramStatement;
    let nextPrgStmt: ProgramStatement;
    let currentPrgStmt = block[i];
    let currentLangStmt = langStmts[currentPrgStmt.id];

    if (currentLangStmt === undefined) {
      block.splice(i, 1);
      continue;
    }

    if ((currentPrgStmt as CompoundStatement).block) {
      analyzeBlock((currentPrgStmt as CompoundStatement).block, langStmts, currentPrgStmt);
    }

    if (currentPrgStmt.isInvalid) {
      delete currentPrgStmt.isInvalid;
    }

    if (i - 1 >= 0) {
      previousPrgStmt = block[i - 1];
    }
    if (i + 1 < block.length) {
      nextPrgStmt = block[i + 1];
    }

    if (currentLangStmt.predecessors) {
      if (!previousPrgStmt) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
      if (!currentLangStmt.predecessors.includes(previousPrgStmt.id)) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
    }

    if (currentLangStmt.successors) {
      if (!nextPrgStmt) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
      if (!currentLangStmt.successors.includes(nextPrgStmt.id)) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
    }

    if (currentLangStmt.parents) {
      if (parentStmt === null) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
      if (!currentLangStmt.parents.includes(parentStmt.id)) {
        currentPrgStmt.isInvalid = true;
        continue;
      }
    }
  }
}

export function assignUuidToExprOperands(expr: Expression) {
  for (let opd of expr.value) {
    opd._uuid = uuidv4();
    if (Array.isArray((opd as Expression).value)) {
      assignUuidToExprOperands(opd as Expression);
    }
  }
}

export function assignUuidToBlock(block: Block) {
  block.forEach((stmt) => {
    stmt._uuid = uuidv4();
if ((stmt as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments) {
      for (let arg of (stmt as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments) {
        if (isExpressionArray(arg)) {
          (arg.value as Expression[]).forEach(item => assignUuidToExprOperands(item));
        }
      }
    }

if ((stmt as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments) {
      for (let arg of (stmt as AbstractStatementWithArgs | CompoundStatementWithArgs).arguments) {
        if (isExpressionArray(arg)) {
          (arg.value as Expression[]).forEach(item => assignUuidToExprOperands(item));
        }
      }
    }

    if ((stmt as CompoundStatement).block) {
      assignUuidToBlock((stmt as CompoundStatement).block);
    }
  });
}

export function assignUuidToImportedProgram(program: { block: Block; header: Header }) {
  // Assign UUIDs to the main block
  assignUuidToBlock(program.block);

  // Assign UUIDs to all user procedures
  for (let proc of Object.keys(program.header.userProcedures)) {
    assignUuidToBlock(program.header.userProcedures[proc]);
  }
}

export class Program {
  header: Header;
  block: Block;

  constructor() {
    this.header = {
      userVariables: {},
      userProcedures: {},
      skeletonize: [], // Added skeletonize to the header
    };
    this.block = [];
  }

  loadProgramBody(block: Block) {
    assignUuidToBlock(block);
    this.block = block;
  }

  loadProgram(programExport: any) {
    for (let proc of Object.keys(programExport.header.userProcedures)) {
      assignUuidToBlock(programExport.header.userProcedures[proc]);
    }
    assignUuidToBlock(programExport.block);

    this.header.userProcedures = programExport.header.userProcedures;
    this.header.userVariables = programExport.header.userVariables;
    this.header.skeletonize = programExport.header.skeletonize || []; // Load skeletonize if present
    this.block = programExport.block;
  }

  exportProgramBlock(block: Block) {
    let blockCopy = JSON.parse(JSON.stringify(block));

    function removeUuidFromExprOperands(expr: Expression) {
      delete expr._uuid;
      for (let opd of expr.value) {
        delete opd._uuid;
        if (Array.isArray((opd as Expression).value)) {
          removeUuidFromExprOperands(opd as Expression);
        }
      }
    }

    function removeUuidFromBlock(block: Block) {
      for (let stmt of block) {
        delete stmt._uuid;
        if (stmt.isInvalid) {
          delete stmt.isInvalid;
        }
        if ((stmt as AbstractStatementWithArgs).arguments) {
          for (let arg of (stmt as AbstractStatementWithArgs).arguments) {
            if (arg.type === Types.boolean_expression) {
              if (isExpressionArray(arg)) {
                (arg.value as Expression[]).forEach(item => removeUuidFromExprOperands(item));
              }
            }
          }
        }

        if ((stmt as CompoundStatement).block) {
          removeUuidFromBlock((stmt as CompoundStatement).block);
        }
      }
    }

    removeUuidFromBlock(blockCopy);
    return blockCopy;
  }

  exportProgram() {
    let programExport = {
      header: {
        userVariables: this.header.userVariables,
        userProcedures: this.header.userProcedures,
        skeletonize: this.header.skeletonize, 
      },
      block: this.exportProgramBlock(this.block),
    };

    let proceduresCopy = JSON.parse(JSON.stringify(this.header.userProcedures));
    for (let proc of Object.keys(proceduresCopy)) {
      proceduresCopy[proc] = this.exportProgramBlock(proceduresCopy[proc]);
    }
    programExport.header.userProcedures = proceduresCopy;

    return programExport;
  }

  exportLinearizedProgram() {
    // Create a deep copy of the program to avoid modifying the original
    let programCopy = JSON.parse(JSON.stringify(this));
    
    // Function to recursively replace procedure calls with their definitions
    const expandProcedures = (block: Block): Block => {
      let expandedBlock: Block = [];
      
      for (let stmt of block) {
        // If this statement is a procedure call (exists in userProcedures)
        if (this.header.userProcedures[stmt.id]) {
          // Get the procedure's block and expand it recursively
          const procedureBlock = JSON.parse(JSON.stringify(this.header.userProcedures[stmt.id]));
          const expandedProcedure = expandProcedures(procedureBlock);
          // Add all statements from the procedure
          expandedBlock.push(...expandedProcedure);
        } else if ((stmt as CompoundStatement).block) {
          // If it's a compound statement, recursively expand its block
          const compoundStmt = stmt as CompoundStatement;
          compoundStmt.block = expandProcedures(compoundStmt.block);
          expandedBlock.push(stmt);
        } else {
          // Regular statement, just add it
          expandedBlock.push(stmt);
        }
      }
      
      return expandedBlock;
    };

    // Expand all procedures in the main block
    programCopy.block = expandProcedures(programCopy.block);

    // Export the program without the procedures in header since they're now inlined
    let programExport = {
      header: {
        userVariables: programCopy.header.userVariables,
        userProcedures: {}, // Empty since all procedures are inlined
        skeletonize: programCopy.header.skeletonize, // Ensure skeletonize is included
      },
      block: this.exportProgramBlock(programCopy.block),
    };

    return programExport;
  }

  addStatement(block: Block, statement: stmt) {
    let resultStatement: any = {};

    function initArgs() {
      for (let arg of statement.arguments) {
        resultStatement['arguments'].push({
          type: arg.type,
          value: initDefaultArgumentType(arg.type)
        });
      }
    }

    resultStatement['_uuid'] = uuidv4();
    resultStatement['id'] = statement.key;
    switch (statement.type) {
      case 'unit':
        break;
      case 'unit_with_args':
        resultStatement['arguments'] = [];
        initArgs();
        break;
      case 'compound':
        resultStatement['block'] = [];
        break;
      case 'compound_with_args':
        resultStatement['block'] = [];
        resultStatement['arguments'] = [];
        initArgs();
        break;
    }

    block.push(resultStatement);
  }
}

export function getBlockDependencies(block: Block, langStmts: Statements): Set<string> {
  const dependencies = new Set<string>();

  const addDependencies = (stmt: ProgramStatement) => {
    const langStmt = langStmts[stmt.id];
    if (langStmt && langStmt.predecessors) {
      langStmt.predecessors.forEach((pred) => {
        dependencies.add(pred);
        const predStmt = block.find((s) => s.id === pred);
        if (predStmt) {
          addDependencies(predStmt);
        }
      });
    }
    if ((stmt as CompoundStatement).block) {
      (stmt as CompoundStatement).block.forEach(addDependencies);
    }
  };

  block.forEach(addDependencies);
  return dependencies;
}

export function getBlockDependents(block: Block, langStmts: Statements): Set<string> {
  const dependents = new Set<string>();

  const addDependents = (stmt: ProgramStatement) => {
    const langStmt = langStmts[stmt.id];
    if (langStmt && langStmt.successors) {
      langStmt.successors.forEach((succ) => {
        dependents.add(succ);
        const succStmt = block.find((s) => s.id === succ);
        if (succStmt) {
          addDependents(succStmt);
        }
      });
    }
    if ((stmt as CompoundStatement).block) {
      (stmt as CompoundStatement).block.forEach(addDependents);
    }
  };

  block.forEach(addDependents);
  return dependents;
}

type stmt = {
  type: LanguageStatementType;
  key: string;
  arguments?: Argument[];
};

export type Block = ProgramStatement[];

export type Header = {
  userVariables: {
    [id: string]: UserVariable;
  };
  userProcedures: {
    [id: string]: Block;
  };
  skeletonize: any[]; // Added skeletonize to the header type
};

export type UserVariable = {
  type: UserVariableType;
  value: UserVariableValue;
};

export type UserVariableValue = string | number | boolean | Expression;

export const userVariableTypes = [Types.string, Types.number, Types.boolean, Types.boolean_expression] as const;
type UserVariableTypesTuple = typeof userVariableTypes;
export type UserVariableType = UserVariableTypesTuple[number];

export type ProgramStatement =
  | AbstractStatement
  | AbstractStatementWithArgs
  | CompoundStatement
  | CompoundStatementWithArgs;

export type AbstractStatement = {
  _uuid?: string;
  id: string;
  isInvalid?: boolean;
};

export type AbstractStatementWithArgs = AbstractStatement & {
  arguments: ProgramStatementArgument[];
};
export type CompoundStatement = AbstractStatement & {
  block: Block;
};

export type CompoundStatementWithArgs = AbstractStatement & CompoundStatement & AbstractStatementWithArgs;

export type ProgramStatementArgument = {
  type: ArgumentType;
  value: string | number | boolean | Expression[] | Devices[];
};

export type Expression = {
  value: ExpressionOperands;
  type?: ExpressionOperator;
  _uuid?: string;
};
export type Devices = {
  value: ExpressionOperands;
  type?: ExpressionOperator;
  _uuid?: string;
};

export type ExpressionOperands = (ExpressionOperand | Expression)[];

export type ExpressionOperator = CompareOperator | BoolOperator | NumericOperator | ExpressionOperandType;

export type ExpressionOperand = {
  type: ExpressionOperandType;
  value: string | number | boolean | Expression;
  _uuid?: string;
};

export const expressionOperandTypes = [Types.string, Types.number, Types.boolean, Types.boolean_expression, Types.variable, Types.unknown] as const;
type ExpressionOperandTypesTuple = typeof expressionOperandTypes;
export type ExpressionOperandType = ExpressionOperandTypesTuple[number];

export const compareOperators = ['<', '>', '<=', '>=', '===', '!=='] as const;
type CompareOperatorsTuple = typeof compareOperators;
export type CompareOperator = CompareOperatorsTuple[number];

export const boolOperators = ['&&', '||', '!'] as const;
type BoolOperatorsTuple = typeof boolOperators;
export type BoolOperator = BoolOperatorsTuple[number];

export const numericOperators = ['+', '-', '*', '/', '%'] as const;
type NumericOperatorsTuple = typeof numericOperators;
export type NumericOperator = NumericOperatorsTuple[number];

export const isExpressionOperator = (operator: string) => {
  return operator in compareOperators || operator in boolOperators || operator in numericOperators;
}

export const isExpressionArray = (argument: ProgramStatementArgument) => Array.isArray(argument.value);
