class AlarmConfigCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._alarmState = { active: false };
  }

  static getStubConfig() {
    return {
      type: "custom:alarm-config-card",
      title: "",
      tag_type: "",
      tag_custom: "",
      target_entity: "",
      trigger_types: [],
      door_open_seconds: 60,
      alarm_enabled: true,
      sound_enabled: false,
      sound_player: "",
      sound_path: "",
      email_enabled: false,
      email_subject: "Alarm Notification",
      email_body: "",
      mobile_enabled: false,
      mobile_service: [],
      auto_clear_enabled: false,
      auto_clear_enabled: false,
      auto_clear_seconds: ""
    };
  }

  static getConfigElement() {
    return document.createElement("alarm-config-card-editor");
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._config = Object.assign({
      type: "custom:alarm-config-card",
      alarm_enabled: true
    }, config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._fetchAlarmState();
    this._render();
  }

  getCardSize() {
    return 2;
  }

  async _fetchAlarmState() {
    if (!this._hass || !this._config?.config_id) {
      return;
    }
    try {
      const state = await this._hass.connection.sendMessagePromise({
        type: "alarm_config_card/get_alarm_state",
        config_id: this._config.config_id,
      });
      if (state) {
        this._alarmState = state;
        this._render();
      }
    } catch (err) {
      // Ignore fetch failures
    }
  }

  _getDisplayTitle() {
    const title = (this._config && this._config.title) || "";
    if (title) {
      return title;
    }
    const targetEntity = (this._config && this._config.target_entity) || "";
    if (!this._hass || !targetEntity) {
      return "Alarm";
    }
    const stateObj = this._hass.states[targetEntity];
    if (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) {
      return stateObj.attributes.friendly_name;
    }
    return targetEntity || "Alarm";
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const title = this._getDisplayTitle();
    const isOn = !!(this._config && this._config.alarm_enabled);
    const active = this._alarmState && this._alarmState.active;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
          border-left: 4px solid transparent;
        }
        ha-card.alarm-active {
          border-left-color: var(--error-color);
          background: var(--error-color);
        }
        ha-card.alarm-active .name,
        ha-card.alarm-active .alert {
          color: #fff;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
        }
        .name {
          font-size: 0.95rem;
          font-weight: 500;
        }
        .toggle {
          flex-shrink: 0;
        }
        .alert {
          margin-top: 8px;
          padding: 6px 8px;
          border-radius: 6px;
          background: var(--error-color);
          color: #fff;
          font-size: 0.85rem;
        }
      </style>
      <ha-card class="${active ? "alarm-active" : ""}">
        <div class="row">
          <div class="name">${this._escapeHtml(title)}</div>
          <div class="toggle">
            <ha-switch id="alarm-toggle" ${isOn ? "checked" : ""}></ha-switch>
          </div>
        </div>
        ${active ? `<div class="alert">Alarm triggered</div>` : ""}
      </ha-card>
    `;

    const toggle = this.shadowRoot.getElementById("alarm-toggle");
    if (toggle) {
      toggle.addEventListener("change", (ev) => {
        this._config.alarm_enabled = ev.target.checked;
        if (this._hass && this._config.config_id) {
          this._hass.callService("alarm_config_card", "set_card_config", {
            config_id: this._config.config_id,
            config: this._config,
          });
        }
        this._render();
      });
    }
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

class AlarmConfigCardEditor extends HTMLElement {
  constructor() {
    super();
    this._formEntity = null;
    this._formTrigger = null;
    this._formAlert = null;
    this._formTitle = null;
    this._config = null;
    this._hasLayout = false;
    this._handleFormChange = this._handleFormChange.bind(this);
  }

  setConfig(config) {
    this._config = { ...config };
    this._ensureConfigId();
    if (this._formEntity) {
      this._refreshForms();
    } else {
      this._render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._formEntity) {
      this._refreshForms();
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
          .section-title {
            font-weight: 600;
            margin: 12px 0 8px;
          }
          .helper {
            margin: 8px 0 0;
            color: var(--secondary-text-color);
            font-size: 0.9rem;
          }
        </style>
        <div class="card-config">
          <div class="section-title">Card title (optional)</div>
          <ha-form id="form-title"></ha-form>
          <div class="section-title">Tag (optional)</div>
          <ha-form id="form-tag"></ha-form>
          <div class="section-title">Section 1: Entity</div>
          <ha-form id="form-entity"></ha-form>
          <div class="section-title">Section 2: Triggers</div>
          <ha-form id="form-trigger"></ha-form>
          <p class="helper">Select trigger modes.</p>
          <div class="section-title">Section 3: Alerts</div>
          <ha-form id="form-alert"></ha-form>
        </div>
      `;
      this._formTitle = this.shadowRoot.querySelector("#form-title");
      this._formTag = this.shadowRoot.querySelector("#form-tag");
      this._formEntity = this.shadowRoot.querySelector("#form-entity");
      this._formTrigger = this.shadowRoot.querySelector("#form-trigger");
      this._formAlert = this.shadowRoot.querySelector("#form-alert");

      [this._formTitle, this._formTag, this._formEntity, this._formTrigger, this._formAlert].forEach((form) => {
        form.addEventListener("value-changed", this._handleFormChange);
      });

      this._formEntity.computeLabel = (schema) => {
        if (schema.name === "target_entity") {
          return "Target entity";
        }
        return schema.name;
      };

      this._formTag.computeLabel = (schema) => {
        if (schema.name === "tag_type") {
          return "Tag type";
        }
        if (schema.name === "tag_custom") {
          return "Custom tag";
        }
        return schema.name;
      };

      this._formTrigger.computeLabel = (schema) => {
        if (schema.name === "trigger_types") {
          return "Trigger modes";
        }
        if (schema.name === "door_open_seconds") {
          return "Door open delay (sec)";
        }
        return schema.name;
      };

      this._formAlert.computeLabel = (schema) => {
        if (schema.name === "alarm_enabled") {
          return "Alarm enable";
        }
        if (schema.name === "sound_enabled") {
          return "Sound alert";
        }
        if (schema.name === "sound_player") {
          return "Speaker (media_player)";
        }
        if (schema.name === "sound_path") {
          return "Sound path (config)";
        }
        if (schema.name === "email_enabled") {
          return "Email alert";
        }
        if (schema.name === "email_subject") {
          return "Email subject";
        }
        if (schema.name === "email_body") {
          return "Email message";
        }
        if (schema.name === "mobile_enabled") {
          return "Mobile notify";
        }
        if (schema.name === "mobile_service") {
          return "Notify service";
        }
        if (schema.name === "auto_clear_enabled") {
          return "Clear alarm timer";
        }
        if (schema.name === "auto_clear_seconds") {
          return "Clear timer (sec)";
        }
        return schema.name;
      };

      this._hasLayout = true;
    }

    this._refreshForms();
  }

  _refreshForms() {
    if (!this._formEntity || !this._formTrigger || !this._formAlert || !this._formTitle || !this._formTag) {
      return;
    }

    this._formTitle.hass = this._hass;
    this._formTag.hass = this._hass;
    this._formEntity.hass = this._hass;
    this._formTrigger.hass = this._hass;
    this._formAlert.hass = this._hass;

    const targetEntity = this._config.target_entity || "";
    const targetState = targetEntity ? this._hass?.states?.[targetEntity] : null;
    const triggerOptions = this._getTriggerOptions(targetEntity, targetState);
    const notifyOptions = this._getMobileNotifyOptions();
    const MOBILE_NOTIFY_OPTIONS = notifyOptions;


    this._formTitle.schema = [
      {
        name: "title",
        selector: { text: {} },
      },
    ];

    this._formTag.schema = [
      {
        name: "tag_type",
        selector: {
          select: {
            options: [
              { value: "", label: "None" },
              { value: "Breach", label: "Breach" },
              { value: "Silent", label: "Silent" },
              { value: "Door", label: "Door" },
              { value: "Evacuate", label: "Evacuate" },
              { value: "custom", label: "Custom" },
            ],
          },
        },
      },
      {
        name: "tag_custom",
        selector: { text: {} },
      },
    ];

    this._formEntity.schema = [
      {
        name: "target_entity",
        selector: {
          entity: {
            domain: ["binary_sensor", "camera", "lock", "sensor"],
          },
        },
      },
    ];

    this._formTrigger.schema = [
      {
        name: "trigger_types",
        selector: {
          select: {
            multiple: true,
            mode: "list",
            options: triggerOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            })),
          },
        },
      },
      {
        name: "door_open_seconds",
        selector: { number: { min: 1, max: 86400, step: 1, mode: "box" } },
      },
    ];

    this._formAlert.schema = [
      { name: "alarm_enabled", selector: { boolean: {} } },
      { name: "sound_enabled", selector: { boolean: {} } },
      { name: "sound_player", selector: { entity: { domain: "media_player" } } },
      { name: "sound_path", selector: { text: {} } },
      { name: "email_enabled", selector: { boolean: {} } },
      { name: "email_subject", selector: { text: {} } },
      {
        name: "email_body",
        selector: { text: { multiline: true } },
      },
      { name: "mobile_enabled", selector: { boolean: {} } },
      { name: "mobile_service", selector: { select: { multiple: true, mode: "list", options: MOBILE_NOTIFY_OPTIONS } } },
      { name: "auto_clear_enabled", selector: { boolean: {} } },
      { name: "auto_clear_seconds", selector: { number: { min: 1, max: 86400, step: 1, mode: "box" } } },
    ];

    const data = this._getFormData();
    this._formTitle.data = data;
    this._formTag.data = data;
    this._formEntity.data = data;
    this._formTrigger.data = data;
    this._formAlert.data = data;
  }

  _getFormData() {
    return {
      title: this._config?.title || "",
      tag_type: this._config?.tag_type || "",
      tag_custom: this._config?.tag_custom || "",
      target_entity: this._config?.target_entity || "",
      trigger_types: this._config?.trigger_types || [],
      door_open_seconds: this._config?.door_open_seconds ?? 60,
      alarm_enabled: this._config?.alarm_enabled ?? true,
      sound_enabled: this._config?.sound_enabled ?? false,
      sound_player: this._config?.sound_player || "",
      sound_path: this._config?.sound_path || "",
      email_enabled: this._config?.email_enabled ?? false,
      email_subject: this._config?.email_subject || "Alarm Notification",
      email_body: this._config?.email_body || "",
      mobile_enabled: this._config?.mobile_enabled ?? false,
      mobile_service: this._config?.mobile_service || [],
      auto_clear_enabled: this._config?.auto_clear_enabled ?? false,
      auto_clear_seconds: this._config?.auto_clear_seconds || "",
    };
  }

  _handleFormChange(event) {
    event.stopPropagation();
    const value = event.detail.value;
    if (!value) {
      return;
    }

    const updated = { ...this._config };
    Object.keys(value).forEach((key) => {
      const val = value[key];
      if (val === undefined || val === null || val === "") {
        delete updated[key];
      } else {
        updated[key] = val;
      }
    });

    if (JSON.stringify(updated) === JSON.stringify(this._config)) {
      return;
    }

    this._config = updated;
    this._dispatchConfigChanged();
    this._syncToBackend();
  }

  _dispatchConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
      })
    );
  }

  _ensureConfigId() {
    if (this._config.config_id) {
      return;
    }
    this._config.config_id = this._generateId();
    this._dispatchConfigChanged();
    this._syncToBackend();
  }

  _generateId() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `alarm-${Date.now().toString(36)}-${rand}`;
  }

  _syncToBackend() {
    if (!this._hass || !this._config?.config_id) {
      return;
    }
    this._hass.callService("alarm_config_card", "set_card_config", {
      config_id: this._config.config_id,
      config: this._config,
    });
  }

  _getMobileNotifyOptions() {
    if (!this._hass || !this._hass.services || !this._hass.services.notify) {
      return [];
    }
    const services = this._hass.services.notify;
    return Object.keys(services)
      .filter((name) => name.startsWith("mobile_app_"))
      .map((name) => {
        const meta = services[name] || {};
        return { value: `notify.${name}`, label: meta.name || meta.description || `notify.${name}` };
      });
  }

  _getTriggerOptions(entityId, stateObj) {
    if (!entityId) {
      return [
        { value: "cctv_motion", label: "CCTV motion" },
        { value: "door_open_60s", label: "Door open > 60s" },
        { value: "panic_button", label: "Panic button" },
        { value: "smoke", label: "Smoke detected" },
        { value: "emergency_exit", label: "Emergency exit open" },
        { value: "emergency_button", label: "Emergency button" },
      ];
    }

    const domain = entityId.split(".")[0];
    if (domain === "camera") {
      return [
        { value: "cctv_motion", label: "Motion detected" },
        { value: "person", label: "Person detected" },
        { value: "vehicle", label: "Vehicle detected" },
      ];
    }
    if (domain === "sensor") {
      return [
        { value: "above", label: "Above threshold" },
        { value: "below", label: "Below threshold" },
        { value: "changed", label: "Value changed" },
      ];
    }
    if (domain === "binary_sensor") {
      const deviceClass = stateObj?.attributes?.device_class || "";
      if (deviceClass === "door" || deviceClass === "opening") {
        return [
          { value: "door_open_60s", label: "Open > 60s" },
          { value: "on", label: "On open" },
          { value: "off", label: "On close" },
        ];
      }
      if (deviceClass === "motion") {
        return [
          { value: "motion", label: "Motion detected" },
          { value: "off", label: "Motion cleared" },
        ];
      }
      if (deviceClass === "smoke") {
        return [
          { value: "smoke", label: "Smoke detected" },
        ];
      }
      if (deviceClass === "contact" || deviceClass === "window") {
        return [
          { value: "door_open_60s", label: "Open > 60s" },
          { value: "on", label: "On open" },
          { value: "off", label: "On close" },
        ];
      }
      return [
        { value: "on", label: "State on" },
        { value: "off", label: "State off" },
      ];
    }
    if (domain === "lock") {
      return [
        { value: "locked", label: "On lock" },
        { value: "unlocked", label: "On unlock" },
      ];
    }

    return [
      { value: "cctv_motion", label: "CCTV motion" },
      { value: "door_open_60s", label: "Door open > 60s" },
      { value: "panic_button", label: "Panic button" },
      { value: "smoke", label: "Smoke detected" },
      { value: "emergency_exit", label: "Emergency exit open" },
      { value: "emergency_button", label: "Emergency button" },
    ];
  }
}

customElements.define("alarm-config-card", AlarmConfigCard);
customElements.define("alarm-config-card-editor", AlarmConfigCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-config-card",
  name: "Alarm Config Card",
  description: "Simple alarm toggle card."
});

