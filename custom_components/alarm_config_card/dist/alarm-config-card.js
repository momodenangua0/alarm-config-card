class AlarmConfigCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._inputValue = "";
    this._statusMessage = "";
  }

  static getStubConfig() {
    return {
      type: "custom:alarm-config-card",
      entity: "sensor.alarm_config_responsible_people",
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = {
      type: "custom:alarm-config-card",
      entity: "sensor.alarm_config_responsible_people",
      ...config,
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 2;
  }

  _getStateObj() {
    if (!this._hass || !this._config?.entity) {
      return null;
    }
    return this._hass.states[this._config.entity] || null;
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const stateObj = this._getStateObj();
    const people = Array.isArray(stateObj?.attributes?.people)
      ? stateObj.attributes.people
      : [];

    const peopleRaw =
      stateObj?.attributes?.people_raw ||
      (people.length ? people.join("\n") : "");

    if (!this._inputValue) {
      this._inputValue = peopleRaw;
    }

    const missingEntity = !stateObj;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
        }
        .title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .help {
          font-size: 0.9rem;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
        textarea {
          width: 100%;
          min-height: 140px;
          resize: vertical;
          padding: 8px;
          box-sizing: border-box;
          font-family: monospace;
          font-size: 0.9rem;
        }
        .actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        button {
          padding: 6px 12px;
          border: 0;
          border-radius: 6px;
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          cursor: pointer;
        }
        button.secondary {
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }
        .status {
          margin-top: 8px;
          font-size: 0.9rem;
          color: var(--secondary-text-color);
        }
        .warning {
          margin-top: 8px;
          padding: 8px;
          background: var(--error-color);
          color: #fff;
          border-radius: 6px;
        }
      </style>
      <ha-card>
        <div class="title">Alarm Config</div>
        <div class="help">One responsible person or notify service per line.</div>
        <textarea id="people">${this._escapeHtml(this._inputValue)}</textarea>
        <div class="actions">
          <button id="save">Save</button>
          <button id="clear" class="secondary">Clear</button>
        </div>
        ${missingEntity ? `<div class="warning">Entity ${this._config.entity} not found.</div>` : ""}
        ${this._statusMessage ? `<div class="status">${this._escapeHtml(this._statusMessage)}</div>` : ""}
      </ha-card>
    `;

    const textarea = this.shadowRoot.getElementById("people");
    textarea.addEventListener("input", (event) => {
      this._inputValue = event.target.value;
    });

    const saveButton = this.shadowRoot.getElementById("save");
    saveButton.addEventListener("click", () => this._handleSave());

    const clearButton = this.shadowRoot.getElementById("clear");
    clearButton.addEventListener("click", () => this._handleClear());
  }

  _handleSave() {
    if (!this._hass) {
      return;
    }
    this._hass.callService("alarm_config", "set_responsible_people", {
      people: this._inputValue || "",
    });
    this._statusMessage = "Saved";
    this._render();
  }

  _handleClear() {
    if (!this._hass) {
      return;
    }
    this._inputValue = "";
    this._hass.callService("alarm_config", "clear_responsible_people", {});
    this._statusMessage = "Cleared";
    this._render();
  }

  _escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

customElements.define("alarm-config-card", AlarmConfigCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-config-card",
  name: "Alarm Config Card",
  description: "Manage responsible people for alarms.",
});
