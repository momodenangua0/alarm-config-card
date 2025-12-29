![image](https://github.com/ArikShemesh/alarm-config-card/blob/main/custom_components/alarm_config_card/brands/alarm_config_card/logo.png)


# HA Alarm Config Card Integration (+ Card)
A simple Home Assistant integration that turns entities on and off with a precise countdown timer and daily runtime tracking.

<a href="https://coff.ee/codemakor" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/white_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

![image](https://github.com/ArikShemesh/alarm-config-card/blob/main/images/alarm_config_card_dashboard.png)

### Configuration
![image](https://github.com/ArikShemesh/alarm-config-card/blob/main/images/alarm_config_card_card_configuration.png)

## 鉁?Key Features
馃殌 **Out-of-the-box**, pre-packaged timer solution, eliminating manual creation of multiple Home Assistant entities, sensors, and automations.

馃晲 Flexible Timer Control - Set countdown timers in seconds, minutes, hours, or days for any switch, input_boolean, light, or fan

馃搳 **Daily Runtime Tracking** - Automatically tracks and displays daily usage time

馃攧 **Smart Auto-Cancel** - Timer automatically cancels if the controlled device is turned off externally

馃帹 **Professional Timer Card** - Beautiful, modern UI with customizable timer buttons and real-time countdown

馃敂 **Notification Support** - Optional notifications for timer start, finish, and cancellation events

馃寵 **Midnight Reset** - Daily usage statistics reset automatically at midnight

馃憜 Manual Usage Reset - Long-press the daily usage display to reset statistics manually

鈴?**Delayed Start Timers** - Turns devices ON when timer completes and keeps them on indefinitely until manually turned off

## 馃彔 Perfect For

- **Water Heater Control** - Manage boiler schedules  
- **Kitchen Timers** - Control smart switches for appliances
- **Garden Irrigation** - Time watering systems
- **Lighting Control** - Automatic light timers
- **Fan Control** - Bathroom or ventilation fans
- **Any Timed Device** - Universal timer for any switchable device

## 馃摝 Installation

### HACS (Recommended)

鈿狅笍 If you previously added this integration as a custom repository in HACS, it's recommended to remove the custom entry and reinstall it from the official HACS store.
You will continue to receive updates in both cases, but switching ensures you're aligned with the official listing and avoids potential issues in the future.

Use this link to open the repository in HACS and click on Download

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ArikShemesh&repository=alarm-config-card)

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/ArikShemesh/alarm-config-card/releases)
2. Extract the `custom_components/alarm_config_card` folder to your Home Assistant `custom_components` directory
3. **Restart Home Assistant**

**That's it!** The timer card is automatically installed and ready to use - no additional steps required.

## 鈿欙笍 Configuration

### Add Integration Instance
1. Go to **Settings 鈫?Devices & Services**
2. Click **"Add Integration"**
3. Search for **"Alarm Config Card"**
4. Select the device you want to control (switch, light, fan, input_boolean)
5. Give your timer instance a descriptive name (e.g., "Kitchen Timer", "Water Heater")
6. Choose notification entitiy (optional) - can be add more than one
7. Check show seconds (optional) - display seconds in uasge time and notifications

### Add Timer Card to Dashboard
1. **Edit your dashboard**
2. **Add a card**
3. Search for **"Alarm Config Card"** (should appear in the card picker)
4. **Configure the card:**
   - Select your timer instance
   - Customize timer buttons
   - Add a custom card title (optional)
  
## 馃攧 Renaming Timer Instances

### 鉁?Recommended Method
1. Go to **Settings 鈫?Devices & Services**  
2. Find your Alarm Config Card integration
3. Click **Configure** (鈿欙笍 gear icon)
4. Change the name and save

### 馃挕 Note on 3-Dots Rename
If you use the 3-dots menu to rename, open **Configure** once afterward to sync the change.

## 馃帥锔?Card Configuration

### Visual Configuration (Recommended)
Use the card editor in the Home Assistant UI for easy configuration.

### YAML Configuration
```yaml
type: custom:alarm-config-card
timer_buttons:
  - 30
  - 1.5h
  - 15s
  - 1day
hide_slider: false
timer_instance_id: your_instance_entry_id
card_title: Water Heater
power_button_icon: mdi:power
slider_max: 120
reverse_mode: false
slider_unit: min
show_daily_usage: true
slider_thumb_color: null
slider_background_color: null
timer_button_font_color: null
timer_button_background_color: null
power_button_background_color: null
power_button_icon_color: null
```

### Configuration Options

Option | Type | Default | Description
---|---|---|---
`type` | string | - | Must be `custom:alarm-config-card`
`timer_instance_id` | string | - | Entry ID of your timer instance
`timer_buttons` | array | [15,30,60,90,120,150] | Timer duration buttons. Supports mixed units (e.g., `[30, "15s", "1.5h", "1day"]`)
`card_title` | string | - | Custom title for the card
`power_button_icon` | string | mdi:power | Icon for the power button (e.g., `mdi:power`)
`slider_max` | integer | 120 | Slider max value (1-1000)
`slider_unit` | string | min | Unit for the slider (`s`, `min`, `h`)
`reverse_mode` | boolean | false | Enable delayed start (turns device ON when timer ends)
`hide_slider` | boolean | false | Hide the slider control completely
`show_daily_usage` | boolean | true | Display daily usage statistics
`slider_thumb_color` | string | - | Custom color for the slider thumb (hex or rgba)
`slider_background_color` | string | - | Custom color for the slider track
`timer_button_font_color` | string | - | Custom font color for timer buttons
`timer_button_background_color` | string | - | Custom background color for timer buttons
`power_button_background_color` | string | - | Custom background color for the power button
`power_button_icon_color` | string | - | Custom icon color for the power button

## 鉂?Frequently Asked Questions

### Can I have multiple timer instances?
Yes! Add multiple integrations for different devices.

### Does the timer work if Home Assistant restarts?
Yes, active timers resume automatically with offline time compensation.

### Can I customize the timer buttons?
Yes! You can configure values with explicit units. Example: timer_buttons: [30, "45s", "1.5h", "1d"] in the card YAML.

### Why does my usage show a warning message?
This appears when HA was offline during a timer to indicate potential time sync issues.

## 馃毃 Troubleshooting

### Card Not Appearing in Card Picker

1. **Restart Home Assistant:** The card is installed during integration setup
2. **Check integration logs:** Look for any errors during the card installation process
3. **Verify automatic installation:** Check if `/config/www/alarm-config-card/alarm-config-card.js` exists
4. **Clear browser cache:** Hard refresh with Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
5. **Check browser console:** Press F12 and look for JavaScript errors

### Timer Not Working

1. **Check device entity:** Ensure the controlled device exists and is accessible
2. **Verify integration setup:** Go to Settings 鈫?Devices & Services 鈫?Alarm Config Card
3. **Check logs:** Look for errors in Settings 鈫?System 鈫?Logs
4. **Restart integration:** Remove and re-add the integration if needed

### Daily Usage Not Tracking

1. **Device state changes:** Timer only tracks when the device is actually ON
2. **Manual control:** If you turn the device off manually, tracking stops (by design)
3. **Midnight reset:** Usage resets at 00:00 each day automatically

### Card Installation Issues

If the automatic card installation fails:
1. **Check file permissions:** Ensure Home Assistant can write to the `www` directory
2. **Verify disk space:** Ensure sufficient space for file copying
3. **Check integration logs:** Look for specific error messages
4. **Manual fallback:** You can still manually copy the card file from the integration's `dist` folder

## 馃摑 Getting Help

If you encounter issues:

1. **Check the [Issues](https://github.com/ArikShemesh/alarm-config-card/issues)** page for existing solutions
2. **Enable debug logging:**
   ```yaml
   logger:
     logs:
       custom_components.alarm_config_card: debug
   ```
3. **Create a new issue** with:
   - Home Assistant version
   - Integration version
   - Detailed error description
   - Relevant log entries

## 馃 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 馃搫 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 猸?Support

If you find this integration useful, please consider:
- 猸?**Starring this repository**
- 馃悰 **Reporting bugs** you encounter
- 馃挕 **Suggesting new features**
- 馃摉 **Improving documentation**

---

## Star History

<a href="https://www.star-history.com/#ArikShemesh/alarm-config-card&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ArikShemesh/alarm-config-card&type=date&theme=dark&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ArikShemesh/alarm-config-card&type=date&legend=top-left" />
 </picture>
</a>

**Made with 鉂わ笍 for the Home Assistant community**
