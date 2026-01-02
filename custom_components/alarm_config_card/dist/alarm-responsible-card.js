class AlarmResponsibleCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
  }

  static getStubConfig() {
    return {
      type: "custom:alarm-responsible-card",
      services: []
    };
  }

  static getConfigElement() {
    return document.createElement("alarm-responsible-card-editor");
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._config = Object.assign({ services: [] }, config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 1;
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const services = this._config?.services || [];
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
        }
        .title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .list {
          font-size: 0.9rem;
          color: var(--secondary-text-color);
        }
      </style>
      <ha-card>
        <div class="title">Responsible People</div>
        <div class="list">
          ${services.length ? services.map((s) => this._escapeHtml(s)).join("<br/>") : "No services selected"}
        </div>
      </ha-card>
    `;
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

class AlarmResponsibleCardEditor extends HTMLElement {
  constructor() {
    super();
    this._form = null;
    this._config = null;
    this._hasLayout = false;
    this._handleFormChange = this._handleFormChange.bind(this);
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._form) {
      this._form.data = this._getFormData();
    } else {
      this._render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) {
      this._form.hass = hass;
    } else {
      this._render();
    }
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    if (!this._config) {
      this.shadowRoot.innerHTML = `<div class="card-config">Configuration not ready.</div>`;
      return;
    }

    if (!this._hasLayout) {
      this.shadowRoot.innerHTML = `
        <style>
          .card-config {
            padding: 16px;
          }
        </style>
        <div class="card-config">
          <ha-form></ha-form>
        </div>
      `;
      this._form = this.shadowRoot.querySelector("ha-form");
      this._form.addEventListener("value-changed", this._handleFormChange);
      this._form.computeLabel = (schema) => {
        if (schema.name === "services") {
          return "Responsible people (mobile_app notify services)";
        }
        return schema.name;
      };
      this._hasLayout = true;
    }

    this._form.hass = this._hass;
    this._form.schema = [
      {
        name: "services",
        selector: {
          select: {
            multiple: true,
            mode: "list",
            options: this._getNotifyOptions(),
          },
        },
      },
    ];
    this._form.data = this._getFormData();
  }

  _getNotifyOptions() {
    if (!this._hass || !this._hass.services) {
      return [];
    }
    const notifyServices = this._hass.services.notify || {};
    return Object.keys(notifyServices)
      .filter((name) => name.startsWith("mobile_app_"))
      .map((name) => {
        const meta = notifyServices[name] || {};
        const label = meta.name || meta.description || `notify.${name}`;
        return { value: `notify.${name}`, label };
      });
  }

  _getFormData() {
    return {
      services: this._config?.services || [],
    };
  }

  _handleFormChange(event) {
    event.stopPropagation();
    const value = event.detail.value;
    if (!value) {
      return;
    }

    const updated = { ...this._config, ...value };
    this._config = updated;

    if (this._hass) {
      this._hass.callService("alarm_config_card", "set_responsible_people", {
        services: updated.services || [],
      });
    }

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
      })
    );
  }
}

customElements.define("alarm-responsible-card", AlarmResponsibleCard);
customElements.define("alarm-responsible-card-editor", AlarmResponsibleCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-responsible-card",
  name: "Alarm Responsible People",
  description: "Manage responsible people for alarm notifications.",
});

