# Audio Files Directory

## Ringtone for Incoming Calls

Place your custom ringtone file here as `ringtone.mp3` to be used for incoming voice and video calls.

### Requirements:
- **Format**: MP3
- **Recommended duration**: 5-10 seconds (it will loop automatically)
- **Recommended bitrate**: 128 kbps
- **File size**: Under 100 KB recommended

### File location:
```
public/audio/ringtone.mp3
```

### Fallback Behavior:
If no `ringtone.mp3` file is found, the app will automatically use a Web Audio API-generated ringtone (classic phone ring sound).

### Where to find free ringtones:
- [Zedge](https://www.zedge.net/ringtones) - Free ringtone library
- [FreeSounds](https://freesound.org/) - Free sound effects
- Create your own using Audacity or GarageBand

### Example ringtone placement:
```bash
# From your project root
cp your-ringtone.mp3 public/audio/ringtone.mp3
```

The ringtone service will automatically detect and use this file when incoming calls arrive.
