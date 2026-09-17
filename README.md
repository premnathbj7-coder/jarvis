# J.A.R.V.I.S. — Local AI Desktop Assistant

JARVIS is a fully **LOCAL** desktop AI assistant running natively on Windows. Powered by **Ollama**, it operates 100% offline without cloud AI APIs or external API keys during normal runtime.

---

## Architecture Overview

```
                                    USER
                                     │
                                     ▼
                            JARVIS GUI / UI (Qt)
                                     │
                                     ▼
                          STATE MACHINE: THINKING
                                     │
                                     ▼
                          PHI-3 MINI ROUTER
                       (ollama.chat: phi3:mini)
                       [Constrained JSON Mode]
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   {"type": "command"}       {"type": "memory"}      {"type": "conversation"}
           │                         │                         │
           ▼                         ▼                         ▼
     core/commands.py         memory/store.py           STATE MACHINE:
  (Deterministic Exec)      (nomic-embed-text          RETRIEVE MEMORY
           │                Vector DB Storage)                 │
 ┌─────────┴─────────┐               │                         ▼
 ▼                   ▼               │                GEMMA 3 12B BRAIN
Existing           Existing          │               (gemma3:12b-it-q4_K_M)
Automation        Productivity       │                         │
& Security        & Plugins          └────────────────────────►│
(Apps, Calc,      (Timers, Notes,                              ▼
 Screenshot)       System, etc.)                        JARVIS RESPONSE
```

---

## Required Software & Models

### 1. Prerequisites
- **Windows 10 / 11**
- **Python 3.10+**
- **Ollama**: Download and install from [ollama.com](https://ollama.com/)

### 2. Pull Required Ollama Models
Open a terminal and pull the 3 required local models:

```bash
ollama pull phi3:mini
ollama pull gemma3:12b-it-q4_K_M
ollama pull nomic-embed-text
```

---

## Installation & Setup

1. **Clone or navigate to the JARVIS directory**:
   ```cmd
   cd "c:\ffmpeg\JARVIS 2\JARVIS"
   ```

2. **Install Python dependencies**:
   ```cmd
   pip install -r requirements.txt
   ```

3. **Ensure Ollama is running**:
   Ollama runs in the background at `http://localhost:11434`.

4. **Run JARVIS**:
   ```cmd
   python main.py
   ```

---

## Project Structure

```
JARVIS/
├── main.py                     # Primary entry point (boots PySide6 GUI / console fallback)
├── config.py                   # Central configuration exports & defaults
├── config.yaml                 # Master configuration file
├── requirements.txt            # Local Python dependencies (includes ollama)
│
├── core/                       # Core Assistant Orchestration
│   ├── assistant.py            # Top-level Assistant facade & startup health checks
│   ├── brain.py                # Gemma 3 12B Core Reasoning Brain (gemma3:12b-it-q4_K_M)
│   ├── router.py               # Phi-3 Mini Intent Classifier (phi3:mini)
│   ├── commands.py             # Whitelisted deterministic Python command executor
│   ├── ollama_client.py        # Wrapper around official python ollama SDK
│   ├── personality.py         # System prompt builder & JARVIS persona
│   ├── command_router.py       # Main pipeline router (Intent -> Command / Memory / Brain)
│   ├── config_loader.py        # YAML + .env loader
│   ├── context.py              # Turn history & session context tracking
│   ├── events.py               # Application event bus
│   ├── logger.py               # Centralized logging
│   └── state.py                # Assistant lifecycle state machine
│
├── memory/                     # Local Memory Subsystem
│   ├── embeddings.py           # Nomic Embeddings wrapper (nomic-embed-text)
│   ├── store.py                # Local SQLite vector storage & Cosine Similarity search
│   ├── database.py             # Thread-safe SQLite database wrapper
│   ├── conversation_memory.py  # Persisted turn history
│   ├── user_memory.py          # Structured user facts store
│   └── memory_manager.py       # Unified memory facade
│
├── automation/                 # Desktop Automation Tools
│   ├── screenshot.py           # Screenshot capture (saved under data/screenshots/)
│   ├── applications.py         # Whitelisted application launch & close registry
│   ├── browser.py              # Web browser controls
│   ├── clipboard.py            # Clipboard access
│   ├── files.py                # Known folder & file search
│   ├── media.py                # Media controls (play/pause/volume)
│   ├── keyboard.py             # Keystroke simulation
│   └── mouse.py                # Cursor movements
│
├── productivity/               # Built-in Productivity Tools
│   ├── calculator.py           # Safe math expression evaluator
│   ├── notes.py                # Notes manager
│   ├── reminders.py            # Polling reminder manager
│   ├── tasks.py                # To-do list manager
│   └── timers.py               # Timer manager with callbacks
│
├── security/                   # System Security & Safety
│   ├── command_validator.py    # Command permissions & validation
│   ├── confirmations.py        # Destructive action interactive confirmation prompts
│   └── permissions.py          # Permission definitions
│
├── system/                     # Diagnostic System Monitoring
│   ├── system_info.py          # Summary system diagnostics
│   ├── cpu.py, memory.py, etc. # Hardware metrics
│
├── orb/                        # Audio-Reactive Animated Orb
│   └── orb_engine.py           # PySide6 custom-rendered 3D-styled visualizer
│
├── ui/                         # User Interface
│   ├── main_window.py          # Dark HUD main GUI window & background workers
│   └── chat_panel.py           # Conversation widget
│
└── voice/                      # Voice & Speech Pipeline
    ├── audio_manager.py        # Multi-threaded audio coordinator
    ├── speech_to_text.py       # Google STT speech recognition
    ├── text_to_speech.py       # Offline pyttsx3 Text-to-Speech
    └── wake_word.py            # Porcupine wake word engine
```

---

## Supported Commands

JARVIS supports whitelisted deterministic commands as well as open-ended conversational reasoning:

| Command Category | Example Input | Handled By |
| :--- | :--- | :--- |
| **Screenshot** | *"Take a screenshot"* / *"Capture my screen"* | `automation/screenshot.py` -> `data/screenshots/` |
| **Application Launch** | *"Open Chrome"* / *"Open Notepad"* / *"Open Calculator"* | `automation/applications.py` |
| **Close Application** | *"Close Notepad"* | `automation/applications.py` |
| **Open Folder** | *"Open Downloads"* / *"Open Documents"* | `automation/files.py` |
| **Open Website** | *"Open YouTube"* / *"Open GitHub"* | `automation/browser.py` |
| **System Info** | *"Check CPU usage"* / *"System status"* | `system/system_info.py` |
| **Timers & Reminders** | *"Set a timer for 5 minutes"* / *"Remind me to call John at 5pm"* | `productivity/timers.py`, `reminders.py` |
| **Notes & Tasks** | *"Create a note called Project Plan"* / *"Add buy groceries to my tasks"* | `productivity/notes.py`, `tasks.py` |
| **Calculator** | *"Calculate 125 * 8"* | `productivity/calculator.py` |
| **Local Memory** | *"Remember that my presentation is on Friday"* | `memory/store.py` (`nomic-embed-text`) |
| **Memory Recall** | *"What did I tell you about my presentation?"* | `memory/store.py` + `gemma3:12b-it-q4_K_M` |
| **General Chat** | *"Explain how quantum computing works"* | `core/brain.py` (`gemma3:12b-it-q4_K_M`) |

---

## Memory Architecture

JARVIS uses a 100% local vector memory architecture:
1. **Embedding Generation**: User facts are embedded using `nomic-embed-text` into 768-float vector arrays via Ollama.
2. **Local Storage**: Vectors and text content are stored locally in `data/database/jarvis.db` (SQLite).
3. **Semantic Retrieval**: When a query is asked, Cosine Similarity compares the query embedding against stored vectors.
4. **Context Injection**: Relevant recalled memories are injected into `gemma3:12b-it-q4_K_M`'s system prompt prior to response generation.

---

## Troubleshooting

1. **Ollama is not running**:
   - Error in UI: *"Ollama is not running. Please start Ollama..."*
   - Fix: Start the Ollama application from the Start Menu or run `ollama serve` in a terminal.

2. **Missing Local Model**:
   - Error in UI: *"Missing local model(s): gemma3:12b-it-q4_K_M..."*
   - Fix: Open a terminal and run the required pull command:
     ```bash
     ollama pull phi3:mini
     ollama pull gemma3:12b-it-q4_K_M
     ollama pull nomic-embed-text
     ```

3. **PySide6 / GUI missing**:
   - JARVIS automatically degrades to Console Mode in terminal if PySide6 isn't installed. Run `pip install PySide6` to enable the full graphical HUD window and animated Orb.
