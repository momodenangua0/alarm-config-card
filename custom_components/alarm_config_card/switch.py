"""Alarm Config Card alarm enable switch."""
from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Set up the alarm enabled switch."""
    async_add_entities([AlarmEnabledSwitch(hass, entry)])


class AlarmEnabledSwitch(SwitchEntity, RestoreEntity):
    """Switch to enable or disable alarm notifications."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:alarm"
    _attr_name = "Alarm Enabled"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize the switch."""
        self.hass = hass
        self._entry = entry
        self._entry_id = entry.entry_id
        self._switch_entity_id = entry.data.get("switch_entity_id")
        self._attr_unique_id = f"alarm_enabled_{self._entry_id}"
        self._is_on = entry.data.get("alarm_enabled", True)
        self._update_unsub = None

    @property
    def is_on(self) -> bool:
        """Return whether the alarm is enabled."""
        return self._is_on

    @property
    def device_info(self) -> DeviceInfo | None:
        """Link this entity to the device of the switch it monitors."""
        if not self._switch_entity_id:
            return None

        ent_reg = er.async_get(self.hass)
        entity_entry = ent_reg.async_get(self._switch_entity_id)

        if not entity_entry or not entity_entry.device_id:
            return None

        dev_reg = dr.async_get(self.hass)
        device_entry = dev_reg.async_get(entity_entry.device_id)

        if not device_entry:
            return None

        return DeviceInfo(
            connections=device_entry.connections,
            identifiers=device_entry.identifiers,
        )

    async def async_turn_on(self, **kwargs) -> None:
        """Enable alarm notifications."""
        await self._update_entry_state(True)

    async def async_turn_off(self, **kwargs) -> None:
        """Disable alarm notifications."""
        await self._update_entry_state(False)

    async def async_added_to_hass(self) -> None:
        """Handle entity addition."""
        await super().async_added_to_hass()
        self._update_from_entry()
        self._update_unsub = self._entry.add_update_listener(self._handle_config_entry_update)

        if "alarm_enabled" not in self._entry.data:
            last_state = await self.async_get_last_state()
            if last_state is not None:
                restored = last_state.state == STATE_ON
                await self._update_entry_state(restored, write_ha_state=False)
            else:
                await self._update_entry_state(self._is_on, write_ha_state=False)

        if DOMAIN not in self.hass.data:
            self.hass.data[DOMAIN] = {}
        if self._entry_id not in self.hass.data[DOMAIN]:
            self.hass.data[DOMAIN][self._entry_id] = {}
        self.hass.data[DOMAIN][self._entry_id]["switch"] = self

        self.async_write_ha_state()

    async def async_will_remove_from_hass(self) -> None:
        """Handle entity removal."""
        if self._update_unsub:
            self._update_unsub()
            self._update_unsub = None

        if (DOMAIN in self.hass.data and
            self._entry_id in self.hass.data[DOMAIN] and
            "switch" in self.hass.data[DOMAIN][self._entry_id]):
            del self.hass.data[DOMAIN][self._entry_id]["switch"]

        await super().async_will_remove_from_hass()

    @callback
    def _handle_config_entry_update(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Handle config entry updates."""
        self._entry = entry
        self._switch_entity_id = entry.data.get("switch_entity_id")
        self._update_from_entry()
        self.async_write_ha_state()

    def _update_from_entry(self) -> None:
        """Refresh local state from the config entry."""
        self._is_on = self._entry.data.get("alarm_enabled", True)

    async def _update_entry_state(self, enabled: bool, write_ha_state: bool = True) -> None:
        """Persist alarm enabled state to the config entry."""
        data = dict(self._entry.data)
        data["alarm_enabled"] = enabled
        self.hass.config_entries.async_update_entry(self._entry, data=data)
        self._is_on = enabled
        if write_ha_state:
            self.async_write_ha_state()
