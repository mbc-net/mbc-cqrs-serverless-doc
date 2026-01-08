# Demo Assets

This directory contains scripts and tools for creating demo videos and terminal recordings.

## Contents

| File | Description |
|------|-------------|
| `VIDEO_SCRIPT.md` | Full video script with storyboard for 5-7 minute demo |
| `terminal-demo.sh` | Shell script for terminal recording with asciinema |
| `demo.tape` | VHS configuration file for generating terminal GIFs |

## Creating Terminal Demo GIF

### Using VHS (Recommended)

[VHS](https://github.com/charmbracelet/vhs) creates beautiful terminal GIFs.

```bash
# Install VHS
brew install vhs   # macOS
# or
go install github.com/charmbracelet/vhs@latest

# Generate GIF
vhs demo.tape
```

Output: `demo.gif`

### Using asciinema

```bash
# Install asciinema
brew install asciinema   # macOS

# Record terminal session
asciinema rec demo.cast -c "./terminal-demo.sh"

# Upload to asciinema.org or convert to GIF
```

## Creating Video

See `VIDEO_SCRIPT.md` for the full storyboard. Recommended tools:

- **Screen Recording:** OBS Studio, ScreenFlow, or Loom
- **Video Editing:** DaVinci Resolve (free) or Final Cut Pro
- **Terminal:** iTerm2 or Windows Terminal with Dracula theme

## Output Location

Generated demos should be placed in:
```
static/
  └── demo/
      ├── quick-start.gif
      └── quick-start.mp4
```

Then reference in documentation:
```markdown
![Quick Start Demo](/demo/quick-start.gif)
```

## Guidelines

- Use **16-20pt** font size for terminal
- Use **dark theme** (Dracula recommended)
- Keep demos under **2 minutes** for GIFs
- Include **captions** for accessibility
