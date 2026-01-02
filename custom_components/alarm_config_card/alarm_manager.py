"""Alarm trigger management for Alarm Config Card."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from homeassistant.const import STATE_OPEN, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, callback, Event, State
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .responsible_manager import ResponsiblePeopleManager

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
STORE_KEY = f"{DOMAIN}_card_configs"

ALLOWED_CONFIG_KEYS = {
    "config_id",
    "target_entity",
    "trigger_types",
    "trigger_threshold",
    "door_open_seconds",
    "alarm_enabled",
    "sound_enabled",
    "sound_player",
    "sound_path",
    "email_enabled",
    "email_subject",
    "email_body",
    "mobile_enabled",
    "mobile_service",
    "auto_clear_enabled",
    "auto_clear_seconds",
    "title",
}

OPEN_STATES = {"on", "open", "opening"}
MOTION_STATES = {"on", "motion", "detected"}
PRESSED_STATES = {"on", "pressed", "triggered"}
SMOKE_STATES = {"on", "smoke", "detected"}


class AlarmConfigManager:
    """Manage card configs and trigger evaluation."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, STORE_VERSION, STORE_KEY)
        self._configs: Dict[str, Dict[str, Any]] = {}
        self._unsubs: Dict[str, Any] = {}
        self._door_timers: Dict[str, Any] = {}

    async def async_load(self) -> None:
        """Load configs from storage and set listeners."""
        data = await self._store.async_load() or {}
        self._configs = data.get("configs", {})
        for config_id, config in self._configs.items():
            self._setup_listener(config_id, config)

    async def async_set_config(self, config_id: str, config: Dict[str, Any]) -> None:
        """Persist a card config and update listeners."""
        if not config_id:
            return
        sanitized = self._sanitize_config(config_id, config)
        self._configs[config_id] = sanitized
        await self._store.async_save({"configs": self._configs})
        self._setup_listener(config_id, sanitized)

    def _sanitize_config(self, config_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Return a sanitized config payload."""
        data: Dict[str, Any] = {"config_id": config_id}
        for key in ALLOWED_CONFIG_KEYS:
            if key in config:
                data[key] = config[key]
        return data

    def _setup_listener(self, config_id: str, config: Dict[str, Any]) -> None:
        """Attach state listener for a config."""
        self._remove_listener(config_id)
        target_entity = config.get("target_entity")
        if not target_entity:
            return

        @callback
        def _handle_event(event: Event) -> None:
            new_state: Optional[State] = event.data.get("new_state")
            old_state: Optional[State] = event.data.get("old_state")
            self.hass.async_create_task(
                self._process_state_change(config_id, old_state, new_state)
            )

        self._unsubs[config_id] = async_track_state_change_event(
            self.hass, [target_entity], _handle_event
        )

    def _remove_listener(self, config_id: str) -> None:
        """Remove existing listener and timer for config."""
        if config_id in self._unsubs:
            self._unsubs[config_id]()
            self._unsubs.pop(config_id, None)
        if config_id in self._door_timers:
            self._door_timers[config_id]()
            self._door_timers.pop(config_id, None)

    async def _process_state_change(
        self, config_id: str, old_state: Optional[State], new_state: Optional[State]
    ) -> None:
        """Evaluate triggers for a state change."""
        config = self._configs.get(config_id)
        if not config or not new_state:
            return

        if new_state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return

        if not config.get("alarm_enabled", True):
            return

        trigger_types = config.get("trigger_types") or []
        if not trigger_types:
            return

        state_changed = not old_state or old_state.state != new_state.state

        if "door_open_60s" in trigger_types:
            await self._handle_door_open_timer(config_id, config, new_state)

        for trigger in trigger_types:
            if trigger == "door_open_60s":
                continue
            if self._match_trigger(trigger, old_state, new_state, state_changed, config):
                await self._fire_alarm(config, trigger, new_state)

    async def _handle_door_open_timer(
        self, config_id: str, config: Dict[str, Any], new_state: State
    ) -> None:
        """Schedule or cancel the open > 60s trigger."""
        if self._is_open_state(new_state):
            if config_id in self._door_timers:
                return
            seconds = self._get_door_open_seconds(config)

            def _timer_cb(_: Any) -> None:
                self.hass.async_create_task(
                    self._fire_if_still_open(config_id)
                )

            self._door_timers[config_id] = async_call_later(
                self.hass, seconds, _timer_cb
            )
        else:
            if config_id in self._door_timers:
                self._door_timers[config_id]()
                self._door_timers.pop(config_id, None)

    async def _fire_if_still_open(self, config_id: str) -> None:
        """Fire door_open_60s if still open."""
        config = self._configs.get(config_id)
        if not config or not config.get("alarm_enabled", True):
            return
        target_entity = config.get("target_entity")
        if not target_entity:
            return
        state = self.hass.states.get(target_entity)
        if not state or not self._is_open_state(state):
            return
        await self._fire_alarm(config, "door_open_60s", state)

    def _get_door_open_seconds(self, config: Dict[str, Any]) -> float:
        """Return door open delay in seconds."""
        value = config.get("door_open_seconds", 60)
        try:
            seconds = float(value)
        except (TypeError, ValueError):
            return 60.0
        if seconds <= 0:
            return 60.0
        return seconds

    def _match_trigger(
        self,
        trigger: str,
        old_state: Optional[State],
        new_state: State,
        state_changed: bool,
        config: Dict[str, Any],
    ) -> bool:
        """Return True if a trigger matches the state change."""
        state = new_state.state.lower()

        if trigger == "changed":
            return state_changed
        if trigger in ("above", "below"):
            threshold = self._parse_float(config.get("trigger_threshold"))
            value = self._parse_float(new_state.state)
            if threshold is None or value is None:
                return False
            return value > threshold if trigger == "above" else value < threshold
        if trigger in ("on", "off"):
            return state == trigger
        if trigger in ("motion", "cctv_motion"):
            return state in MOTION_STATES
        if trigger == "panic_button":
            return state in PRESSED_STATES
        if trigger == "emergency_button":
            return state in PRESSED_STATES
        if trigger == "smoke":
            return state in SMOKE_STATES
        if trigger == "emergency_exit":
            return state in {"on", "open"}
        if trigger == "locked":
            return state == "locked"
        if trigger == "unlocked":
            return state == "unlocked"
        if trigger == "person":
            return self._match_attribute_trigger(new_state, "person")
        if trigger == "vehicle":
            return self._match_attribute_trigger(new_state, "vehicle")

        return False

    def _match_attribute_trigger(self, state: State, key: str) -> bool:
        """Best-effort attribute trigger matching."""
        attr_val = state.attributes.get(key)
        if isinstance(attr_val, bool):
            return attr_val
        if isinstance(attr_val, (int, float)):
            return attr_val > 0
        if isinstance(attr_val, str):
            return attr_val.lower() in {"on", "true", "detected", "yes"}
        return state.state.lower() == "on"

    def _is_open_state(self, state: State) -> bool:
        """Return True if entity is open/on."""
        return state.state.lower() in OPEN_STATES

    def _parse_float(self, value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    async def _fire_alarm(self, config: Dict[str, Any], trigger: str, state: State) -> None:
        """Send notifications and play sound for a triggered alarm."""
        message = self._build_message(config, trigger, state)
        self._set_alarm_state(config, trigger, state)

        if config.get("email_enabled"):
            subject = config.get("email_subject") or "Alarm Notification"
            await self.hass.services.async_call(
                "pyscript",
                "send_custom_email",
                {"subject": subject, "message": message},
                blocking=False,
            )

        if config.get("mobile_enabled"):
            services = config.get("mobile_service") or []
            if isinstance(services, str):
                services = [services]
            for service in services:
                if not service or "." not in service:
                    continue
                domain, service_name = service.split(".", 1)
                await self.hass.services.async_call(
                    domain,
                    service_name,
                    {"message": message, "title": config.get("title") or "Alarm"},
                    blocking=False,
                )

        await self._notify_responsible_people(config, trigger, message)

        if config.get("sound_enabled"):
            await self._play_sound(config)

        self._schedule_auto_clear(config)

    def _build_message(self, config: Dict[str, Any], trigger: str, state: State) -> str:
        """Build a message for notifications."""
        custom = config.get("email_body")
        if custom:
            return custom

        target = config.get("target_entity") or state.entity_id
        return f"Alarm triggered: {trigger} on {target}"

    async def _play_sound(self, config: Dict[str, Any]) -> None:
        """Play sound on configured media player."""
        player = config.get("sound_player")
        path = config.get("sound_path")
        if not player or not path:
            return

        media_id = self._resolve_media_path(path)
        if not media_id:
            return

        await self.hass.services.async_call(
            "media_player",
            "play_media",
            {
                "entity_id": player,
                "media_content_id": media_id,
                "media_content_type": "music",
            },
            blocking=False,
        )

    async def _notify_responsible_people(
        self, config: Dict[str, Any], trigger: str, message: str
    ) -> None:
        """Notify responsible people via mobile app services."""
        manager: ResponsiblePeopleManager | None = self.hass.data.get(DOMAIN, {}).get(
            "responsible_manager"
        )
        if not manager:
            return
        services = manager.get_services()
        if not services:
            return
        title = config.get("tag_type") or config.get("title") or "Alarm"
        for service in services:
            if not service or "." not in service:
                continue
            domain, service_name = service.split(".", 1)
            await self.hass.services.async_call(
                domain,
                service_name,
                {"message": message, "title": title},
                blocking=False,
            )

    def _set_alarm_state(self, config: Dict[str, Any], trigger: str, state: State) -> None:
        """Store the latest alarm state for the card."""
        config_id = config.get("config_id")
        if not config_id:
            return
        store = self.hass.data[DOMAIN].setdefault("alarm_states", {})
        store[config_id] = {
            "active": True,
            "trigger": trigger,
            "entity_id": state.entity_id,
        }

    def _clear_alarm_state(self, config_id: str) -> None:
        """Clear alarm state for a card."""
        store = self.hass.data[DOMAIN].setdefault("alarm_states", {})
        if config_id in store:
            store[config_id] = {"active": False}

    def _schedule_auto_clear(self, config: Dict[str, Any]) -> None:
        """Schedule auto-clear of alarm state."""
        if not config.get("auto_clear_enabled"):
            return
        seconds = config.get("auto_clear_seconds")
        config_id = config.get("config_id")
        if not config_id:
            return
        if not seconds:
            return
        try:
            seconds = float(seconds)
        except (TypeError, ValueError):
            return
        if seconds <= 0:
            return

        def _timer_cb(_: Any) -> None:
            self._clear_alarm_state(config_id)

        async_call_later(self.hass, seconds, _timer_cb)

    def _resolve_media_path(self, path: str) -> Optional[str]:
        """Resolve config-relative path to /local/ URL."""
        if not path:
            return None
        path = path.strip()
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if path.startswith("/local/"):
            return path
        if path.startswith("local/"):
            return f"/local/{path[len('local/'):]}".replace("//", "/")
        if path.startswith("www/"):
            return f"/local/{path[len('www/'):]}".replace("//", "/")
        return f"/local/{path}".replace("//", "/")
