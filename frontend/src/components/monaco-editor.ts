import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import loader from "@monaco-editor/loader";

@customElement("monaco-editor")
export class MonacoEditor extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) language = "python";

  private editor: any = null;
  private editorContainer: HTMLDivElement | null = null;
  private isInitializing = false;

  createRenderRoot() {
    return this; // Render in the Light DOM for stable style loading, autocomplete boxes and codicons
  }

  firstUpdated() {
    this.editorContainer = this.querySelector(".monaco-editor-container");
    this.initializeMonaco();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("value") && this.editor) {
      if (this.editor.getValue() !== this.value) {
        this.editor.setValue(this.value);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }

  private async initializeMonaco() {
    if (!this.editorContainer || this.isInitializing || this.editor) return;
    this.isInitializing = true;

    try {
      // Configure loader to fetch Monaco from CDN asynchronously
      loader.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.48.0/min/vs",
        },
      });

      const monaco = await loader.init();

      this.editor = monaco.editor.create(this.editorContainer, {
        value: this.value,
        language: this.language,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'Fira Code', 'Courier New', monospace",
        lineHeight: 22,
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        roundedSelection: true,
        scrollBeyondLastLine: false,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
      });

      // Listen for text changes
      this.editor.onDidChangeModelContent(() => {
        const newValue = this.editor.getValue();
        this.value = newValue;
        this.dispatchEvent(
          new CustomEvent("code-change", {
            detail: { value: newValue },
            bubbles: true,
            composed: true,
          }),
        );
      });
    } catch (err) {
      console.error("Failed to initialize Monaco Editor:", err);
    } finally {
      this.isInitializing = false;
    }
  }

  render() {
    return html`
      <div
        class="monaco-editor-container"
        style="width: 100%; height: 200px; min-height: 100px; max-height: 800px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); resize: vertical;"
      ></div>
    `;
  }
}
