import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('editor-devices-modal')
export class EditorDevicesModal extends LitElement {
    static styles = css`
        :host {
        display: block;
        }
    `;

    render() {
        return html`
        <div>
            <p>This is a placeholder for the Devices modal.</p>
        </div>
        `;
    }
}