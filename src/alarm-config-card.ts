class AlarmConfigCard extends HTMLElement {
  private _hass: any = null;
  private _config: AlarmConfigCardConfig | null = null;
  private _inputValue = "";
  private _statusMessage = "";
  private _selectedEntity = "";
  private _triggerType = "motion";
  private _alertMethod = "sound";

  static getStubConfig(): AlarmConfigCardConfig {
    return {
      type: "custom:alarm-config-card",
      entity: "sensor.alarm_config_responsible_people",
      alarm_entity: "",
      trigger_type: "motion",
      alert_method: "sound",
    };
  }

  setConfig(config: AlarmConfigCardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = {
      type: "custom:alarm-config-card",
      entity: "sensor.alarm_config_responsible_people",
      ...config,
    };
    this._selectedEntity = this._config.alarm_entity || "";
    this._triggerType = this._config.trigger_type || "motion";
    this._alertMethod = this._config.alert_method || "sound";

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass: any) {
    this._hass = hass;
    this._render();
  }

  getCardSize(): number {
    return 2;
  }

  private _getStateObj(): any | null {
    if (!this._hass || !this._config?.entity) {
      return null;
    }
    return this._hass.states[this._config.entity] || null;
  }

  private _render(): void {
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
    const entityOptions = this._getEntityOptions();
    const entitySelectOptions = entityOptions.length
      ? entityOptions
          .map((entityId) => {
            const selected = entityId === this._selectedEntity ? " selected" : "";
            return `<option value="${this._escapeHtml(entityId)}"${selected}>${this._escapeHtml(entityId)}</option>`;
          })
          .join("")
      : `<option value="">No entities available</option>`;

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
        .section {
          margin-bottom: 16px;
        }
        .field {
          display: grid;
          gap: 6px;
          margin-bottom: 10px;
        }
        label {
          font-size: 0.85rem;
          color: var(--secondary-text-color);
        }
        select {
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
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
        <div class="section">
          <div class="help">Select a target entity and define how the alarm should trigger.</div>
          <div class="field">
            <label for="alarm-entity">Target entity</label>
            <select id="alarm-entity">
              <option value="">Select an entity</option>
              ${entitySelectOptions}
            </select>
          </div>
          <div class="field">
            <label for="trigger-type">Trigger type</label>
            <select id="trigger-type">
              <option value="motion">Motion detected</option>
              <option value="attic_motion">Attic motion (any time)</option>
              <option value="door_open_60s">Door open 60s</option>
              <option value="panic_button">Panic button</option>
              <option value="smoke">Smoke detector</option>
              <option value="emergency_exit">Emergency exit opened</option>
              <option value="emergency_button">Emergency button</option>
            </select>
          </div>
          <div class="field">
            <label for="alert-method">Alert method</label>
            <select id="alert-method">
              <option value="sound">Sound alert</option>
              <option value="mobile">HA mobile notification</option>
              <option value="email">Email notification</option>
            </select>
          </div>
        </div>
        <div class="help">Responsible people (one per line).</div>
        <textarea id="people">${this._escapeHtml(this._inputValue)}</textarea>
        <div class="actions">
          <button id="save">Save</button>
          <button id="clear" class="secondary">Clear</button>
        </div>
        ${missingEntity ? `<div class="warning">Entity ${this._config.entity} not found.</div>` : ""}
        ${this._statusMessage ? `<div class="status">${this._escapeHtml(this._statusMessage)}</div>` : ""}
      </ha-card>
    `;

    const textarea = this.shadowRoot.getElementById("people") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.addEventListener("input", (event) => {
        this._inputValue = (event.target as HTMLTextAreaElement).value;
      });
    }

    const entitySelect = this.shadowRoot.getElementById("alarm-entity") as HTMLSelectElement | null;
    if (entitySelect) {
      entitySelect.value = this._selectedEntity;
      entitySelect.addEventListener("change", (event) => {
        this._selectedEntity = (event.target as HTMLSelectElement).value;
      });
    }

    const triggerSelect = this.shadowRoot.getElementById("trigger-type") as HTMLSelectElement | null;
    if (triggerSelect) {
      triggerSelect.value = this._triggerType;
      triggerSelect.addEventListener("change", (event) => {
        this._triggerType = (event.target as HTMLSelectElement).value;
      });
    }

    const alertSelect = this.shadowRoot.getElementById("alert-method") as HTMLSelectElement | null;
    if (alertSelect) {
      alertSelect.value = this._alertMethod;
      alertSelect.addEventListener("change", (event) => {
        this._alertMethod = (event.target as HTMLSelectElement).value;
      });
    }

    const saveButton = this.shadowRoot.getElementById("save");
    if (saveButton) {
      saveButton.addEventListener("click", () => this._handleSave());
    }

    const clearButton = this.shadowRoot.getElementById("clear");
    if (clearButton) {
      clearButton.addEventListener("click", () => this._handleClear());
    }
  }

  private _handleSave(): void {
    if (!this._hass) {
      return;
    }
    this._hass.callService("alarm_config", "set_responsible_people", {
      people: this._inputValue || "",
    });
    if (this._config) {
      this._config.alarm_entity = this._selectedEntity;
      this._config.trigger_type = this._triggerType;
      this._config.alert_method = this._alertMethod;
    }
    this._statusMessage = "Saved";
    this._render();
  }

  private _handleClear(): void {
    if (!this._hass) {
      return;
    }
    this._inputValue = "";
    this._hass.callService("alarm_config", "clear_responsible_people", {});
    this._statusMessage = "Cleared";
    this._render();
  }

  private _escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private _getEntityOptions(): string[] {
    if (!this._hass || !this._hass.states) {
      return [];
    }
    const allowedDomains = new Set([
      "binary_sensor",
      "sensor",
      "switch",
      "lock",
      "cover",
    ]);
    return Object.keys(this._hass.states)
      .filter((entityId) => allowedDomains.has(entityId.split(".")[0]))
      .sort();
  }
}

interface AlarmConfigCardConfig {
  type?: string;
  entity?: string;
  alarm_entity?: string;
  trigger_type?: string;
  alert_method?: string;
}

customElements.define("alarm-config-card", AlarmConfigCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-config-card",
  name: "Alarm Config Card",
  description: "Manage responsible people for alarms.",
});
