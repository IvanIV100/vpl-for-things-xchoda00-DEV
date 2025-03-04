import { Language } from '@/vpl/language';
import { Block, Program } from '@/vpl/program';
import { consume } from '@lit/context';
import { html, css, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { languageContext, programContext } from '@/editor/context/editor-context';
import { globalStyles } from '../global-styles';
import { EditorMode } from './editor-controls';

@customElement('graphical-editor')
export class GraphicalEditor extends LitElement {
  //#region Styles
  static styles = [
    globalStyles,
    css`
      :host {
        width: 100%;
        background-color: white;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0.25rem;
        border: 1px solid var(--gray-300);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        border-radius: 0.5rem;
        overflow-y: auto;
        max-height: 540px;
        min-height: 200px;
      }

      .help-message {
        display: flex;
        justify-content: center;
        padding-top: 32px;
        text-align: center;
        color: var(--gray-500);
      }
    `,
  ];
  //#endregion

  //#region Context
  @consume({ context: languageContext })
  @property()
  language?: Language;

  @consume({ context: programContext })
  @property()
  program?: Program;

  @property({ type: Boolean }) skeletonizeMode: boolean = false;
  @property()
  editorMode: EditorMode = 'normal';
  //#endregion

  //#region Render
  render() {
    return html`
      <ge-block
        .block="${this.program.block}"
        .skeletonizeMode="${this.skeletonizeMode}"> <!-- Use skeletonizeMode directly -->
      </ge-block>
      ${!this.skeletonizeMode && this.program.block.length < 1
        ? html` <div class="help-message">Click on "+" button to add new statement</div> `
        : nothing}
    `;
  }
  //#endregion
}

declare global {
  interface HTMLElementTagNameMap {
    'graphical-editor': GraphicalEditor;
  }
}
