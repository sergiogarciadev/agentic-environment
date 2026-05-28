import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./monaco-editor";
import "./markdown-editor";
import { renderMarkdownExtensions } from "./markdown-editor";

export interface CellOutputData {
  type: "text" | "image";
  content: string;
}

@customElement("notebook-cell")
export class NotebookCell extends LitElement {
  @property({ type: Number }) index = 0;
  @property({ type: Number }) cellId = 0;
  @property({ type: String }) code = "";
  @property({ type: String }) type = "python"; // 'python' or 'markdown'
  @property({ type: Array }) outputs: CellOutputData[] = [];
  @property({ type: Boolean }) isRunning = false;

  @state() private editMode = false; // Toggles Markdown view vs edit state

  createRenderRoot() {
    return this; // Render in the Light DOM for easy styling integration and global bootstrap access
  }

  firstUpdated() {
    // If it's a markdown cell and is empty/new, open it in edit mode initially
    if (this.type === "markdown" && !this.code.trim()) {
      this.editMode = true;
    }
  }

  async updated(changedProperties: Map<string, any>) {
    // Render latex, highlighting and diagrams in View Mode when code/type/editMode updates
    if (
      (changedProperties.has("code") ||
        changedProperties.has("editMode") ||
        changedProperties.has("type")) &&
      !this.editMode &&
      this.type === "markdown"
    ) {
      await this.updateComplete;
      const viewContainer = this.querySelector(".markdown-view");
      if (viewContainer) {
        renderMarkdownExtensions(viewContainer as HTMLElement);
      }
    }
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

  private handleMarkdownChange(e: CustomEvent) {
    this.code = e.detail.value;
    this.dispatchEvent(
      new CustomEvent("cell-code-update", {
        detail: { index: this.index, code: this.code },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleTypeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.type = target.value;

    // Auto toggle edit mode when switching to markdown
    if (this.type === "markdown") {
      this.editMode = true;
    }

    this.dispatchEvent(
      new CustomEvent("cell-type-change", {
        detail: { index: this.index, type: this.type },
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

  private toggleEditMode() {
    this.editMode = !this.editMode;
    this.requestUpdate();
  }

  private getParsedMarkdown() {
    if (typeof window !== "undefined" && (window as any).marked) {
      try {
        const rawMarkdown = this.code.trim();
        if (!rawMarkdown) {
          return '<p style="color: var(--text-muted); font-style: italic;">Double-click to write markdown content...</p>';
        }
        return (window as any).marked.parse(rawMarkdown);
      } catch (err) {
        return '<p style="color: var(--accent);">Failed to parse Markdown.</p>';
      }
    }
    return this.code || "Double-click to write markdown content...";
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
            gap: 0.8rem;
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

            <!-- Type Selector Dropdown -->
            <select
              @change="${this.handleTypeChange}"
              style="
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--text-main);
              border-radius: 6px;
              padding: 0.2rem 0.6rem;
              font-family: 'Outfit', sans-serif;
              font-size: 0.85rem;
              font-weight: 500;
              cursor: pointer;
              outline: none;
              transition: all 0.2s ease;
            "
            >
              <option value="python" ?selected="${this.type === "python"}">Code</option>
              <option value="markdown" ?selected="${this.type === "markdown"}">Markdown</option>
            </select>

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
            <!-- Render Action Buttons based on Type -->
            ${this.type === "markdown"
              ? html`
                  <button
                    @click="${this.toggleEditMode}"
                    class="btn-icon btn-run"
                    title="${this.editMode ? "Render Markdown Preview" : "Edit Markdown Source"}"
                    style="
                background: rgba(16, 185, 129, 0.15);
                border: 1px solid rgba(16, 185, 129, 0.3);
                color: var(--secondary);
                cursor: pointer;
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
                    ${this.editMode
                      ? html`
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          Preview
                        `
                      : html`
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M12 20h9"></path>
                            <path
                              d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                            ></path>
                          </svg>
                          Edit
                        `}
                  </button>
                `
              : html`
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
                `}

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

        <!-- Cell Body Panel based on Cell Type -->
        ${this.type === "markdown"
          ? html`
              ${this.editMode
                ? html`
                    <!-- Markdown Split WYSIWYG Editor -->
                    <markdown-editor
                      .value="${this.code}"
                      @markdown-change="${this.handleMarkdownChange}"
                    ></markdown-editor>
                  `
                : html`
                    <!-- Rendered Markdown View panel -->
                    <div
                      @dblclick="${this.toggleEditMode}"
                      class="markdown-view markdown-body"
                      style="
                background: transparent;
                min-height: 50px;
                color: #e5e7eb;
                line-height: 1.6;
                cursor: pointer;
                padding: 0.5rem 0.2rem;
                outline: none;
              "
                      title="Double-click to edit Markdown cell"
                    >
                      <div .innerHTML="${this.getParsedMarkdown()}"></div>
                    </div>
                  `}
            `
          : html`
              <!-- Python Monaco Editor wrapper -->
              <monaco-editor
                .value="${this.code}"
                @code-change="${this.handleCodeChange}"
              ></monaco-editor>

              <!-- Python Cell Output Panel -->
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
            `}
      </div>
    `;
  }
}
