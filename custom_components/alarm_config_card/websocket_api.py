"""WebSocket API for Alarm Config Card."""
from __future__ import annotations

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import DOMAIN


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/get_alarm_state",
        vol.Required("config_id"): str,
    }
)
@websocket_api.async_response
async def websocket_get_alarm_state(hass: HomeAssistant, connection, msg) -> None:
    """Return alarm state for a card."""
    config_id = msg["config_id"]
    state = hass.data.get(DOMAIN, {}).get("alarm_states", {}).get(
        config_id, {"active": False}
    )
    connection.send_result(msg["id"], state)


async def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, websocket_get_alarm_state)
