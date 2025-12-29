# Alarm Config Card

A Home Assistant Lovelace card to manage responsible people for alarms.

## Installation

1. Install this repo (HACS or manual).
2. Restart Home Assistant.
3. The card resource is auto-registered at `/local/alarm-config-card/alarm-config-card.js`.

## Usage

### YAML
```yaml
type: custom:alarm-config-card
entity: sensor.alarm_config_responsible_people
```
