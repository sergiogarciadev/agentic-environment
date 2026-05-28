import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./monaco-editor";

export interface CellOutputData {
  type: "text" | "image";
  content: string;
}

@customElement("notebook-cell")
export class NotebookCell extends LitElement {
  @property({ type: Number }) index = 0;
  @property({ type: Number }) cellId = 0;
  @property({ type: String }) code = "";
  @property({ type: Array }) outputs: CellOutputData[] = [];
  @property({ type: Boolean }) isRunning = false;

  createRenderRoot() {
    return this; // Render in the Light DOM for easy styling integration and global bootstrap access
  }

  private handleCodeChange(e: CustomEvent) {
    this.code = e.detail.value;
    this.dispatchEvent(
      new CustomEvent("cell-code-update", {
        detail: { index: this.index, code: this.code },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private runCell() {
    this.dispatchEvent(
      new CustomEvent("cell-run", {
        detail: { index: this.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private deleteCell() {
    this.dispatchEvent(
      new CustomEvent("cell-delete", {
        detail: { index: this.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private moveUp() {
    this.dispatchEvent(
      new CustomEvent("cell-move-up", {
        detail: { index: this.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private moveDown() {
    this.dispatchEvent(
      new CustomEvent("cell-move-down", {
        detail: { index: this.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div
        class="cell-card ${this.isRunning ? "cell-running" : ""}"
        style="
        background: rgba(17, 24, 39, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        transition: all 0.3s ease;
        position: relative;
      "
      >
        <!-- Cell Toolbar -->
        <div
          class="cell-toolbar"
          style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        "
        >
          <div
            class="cell-badge"
            style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 600;
          "
          >
            <span
              style="
              background: rgba(255, 255, 255, 0.05);
              padding: 0.2rem 0.6rem;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--text-main);
            "
              >In [${this.isRunning ? "*" : this.index + 1}]</span
            >
            ${this.isRunning
              ? html`<span class="glow-text" style="color: var(--secondary);">Running...</span>`
              : ""}
          </div>

          <div
            class="cell-actions"
            style="
            display: flex;
            gap: 0.5rem;
          "
          >
            <button
              @click="${this.runCell}"
              class="btn-icon btn-run"
              title="Run Cell (Shift+Enter)"
              ?disabled="${this.isRunning}"
              style="
              background: ${this.isRunning
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(139, 92, 246, 0.15)"};
              border: 1px solid ${this.isRunning
                ? "rgba(16, 185, 129, 0.2)"
                : "rgba(139, 92, 246, 0.3)"};
              color: ${this.isRunning ? "var(--secondary)" : "var(--primary-hover)"};
              cursor: ${this.isRunning ? "not-allowed" : "pointer"};
              padding: 0.4rem 0.8rem;
              border-radius: 6px;
              font-weight: 600;
              font-family: 'Outfit', sans-serif;
              display: flex;
              align-items: center;
              gap: 0.3rem;
              transition: all 0.2s ease;
            "
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run
            </button>

            <button
              @click="${this.moveUp}"
              class="btn-icon"
              title="Move Up"
              style="
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.06);
              color: var(--text-muted);
              cursor: pointer;
              padding: 0.4rem;
              border-radius: 6px;
              display: flex;
              align-items: center;
              transition: all 0.2s ease;
            "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>

            <button
              @click="${this.moveDown}"
              class="btn-icon"
              title="Move Down"
              style="
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.06);
              color: var(--text-muted);
              cursor: pointer;
              padding: 0.4rem;
              border-radius: 6px;
              display: flex;
              align-items: center;
              transition: all 0.2s ease;
            "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <button
              @click="${this.deleteCell}"
              class="btn-icon"
              title="Delete Cell"
              style="
              background: rgba(244, 63, 94, 0.1);
              border: 1px solid rgba(244, 63, 94, 0.2);
              color: #f87171;
              cursor: pointer;
              padding: 0.4rem;
              border-radius: 6px;
              display: flex;
              align-items: center;
              transition: all 0.2s ease;
            "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Monaco Editor wrapper -->
        <monaco-editor
          .value="${this.code}"
          @code-change="${this.handleCodeChange}"
        ></monaco-editor>

        <!-- Cell Output Panel -->
        ${this.outputs.length > 0
          ? html`
              <div
                class="cell-outputs"
                style="
            margin-top: 1.2rem;
            background: rgba(0, 0, 0, 0.3);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 1.2rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          "
              >
                ${this.outputs.map((out) => {
                  if (out.type === "text") {
                    return html`
                      <pre
                        style="
                    font-family: 'Fira Code', 'Courier New', monospace;
                    font-size: 0.9rem;
                    color: #e5e7eb;
                    white-space: pre-wrap;
                    word-break: break-all;
                    line-height: 1.5;
                  "
                      >
${out.content}</pre
                      >
                    `;
                  } else {
                    return html`
                      <div
                        class="plot-container"
                        style="
                    display: flex;
                    justify-content: center;
                    background: white;
                    padding: 1rem;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    margin: 0.5rem 0;
                  "
                      >
                        <img
                          src="data:image/png;base64,${out.content}"
                          alt="Matplotlib Plot Output"
                          style="max-width: 100%; height: auto; display: block;"
                        />
                      </div>
                    `;
                  }
                })}
              </div>
            `
          : ""}
      </div>
    `;
  }
}
