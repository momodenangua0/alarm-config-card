# Alarm Config Card

Alarm configuration UI and Home Assistant integration. The card lets you edit
responsible people and provides a starter UI for selecting target entities and
alarm behaviors.

## Installation

1. Install this repo (HACS or manual).
2. Restart Home Assistant.
3. The card resource is auto-registered at `/local/alarm-config-card/alarm-config-card.js`.

## Integration setup

1. Go to Settings -> Devices & Services -> Add Integration.
2. Search for "Alarm Config Card" and add it.
3. Complete the setup flow.

## Card usage

### YAML
```yaml
type: custom:alarm-config-card
entity: sensor.alarm_config_responsible_people
```

### UI fields

- Target entity: choose a sensor/door/device entity to bind to a rule.
- Trigger type: choose how the alarm should be triggered (UI only).
- Alert method: choose how to notify (UI only).
- Responsible people: one per line, saved to the integration service.

## Current limitations

- Trigger type and alert method are UI-only for now; they are stored in the
  card config but not sent to the backend yet.
