"""Responsible people management for Alarm Config Card."""
from __future__ import annotations

from typing import Any, Dict, List

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN

STORE_VERSION = 1
STORE_KEY = f"{DOMAIN}_responsible_people"


class ResponsiblePeopleManager:
    """Store and retrieve responsible people notification services."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, STORE_VERSION, STORE_KEY)
        self._services: List[str] = []

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._services = data.get("services", [])

    async def async_set_services(self, services: List[str]) -> None:
        self._services = services or []
        await self._store.async_save({"services": self._services})

    def get_services(self) -> List[str]:
        return list(self._services)
