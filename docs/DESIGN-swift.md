# Morning AI Assistant — Swift Native Design

## Overview
- Goal: Replace PWA + Capacitor with a pure Swift iOS app that meets the requirements in `要件定義書.md`.
- Approach: SwiftUI + MVVM + Combine with modular, capability-based services inspired by Apple MCP server patterns (capabilities/tools, registry, isolation, safety).

## Architecture
- UI: SwiftUI views with MVVM.
- State: Observable view models; minimal global state via a `CapabilityRegistry` (bootstrap + DI source).
- Capabilities (MCP-inspired):
  - Speech Input: `SpeechRecognizerService` (SFSpeechRecognizer wrapper)
  - Speech Output: `SpeechSynthesizerService` (AVSpeechSynthesizer wrapper)
  - AI Backend: `OpenAIClient` (URLSession-based)
  - Alarms: `AlarmScheduler` protocol with `AlarmKitScheduler` (iOS 18+) and `LocalNotificationScheduler` fallback
  - Storage: `StorageService` (UserDefaults), `KeychainService` (API key), `CallLogStore` (JSON files)
  - Web Search (premium): `WebSearchClient` interface (pluggable, stubbed for now)
- Registry: `CapabilityRegistry.bootstrap()` selects concrete implementations based on OS availability, mirroring MCP tool-provider selection.

## Models
- `UserInstruction`: id, title, content, order, isActive, useWebSearch
- `ConversationEntry`: role (.user/.assistant), content, timestamp
- `CallLog`: id, date, duration, instructions, conversation
- `AlarmSettings`: id, enabled, time (HH:mm), days, label, snooze, snoozeDuration
- `Plan`: free/plus/premium with time limits and feature flags

## View Models
- `CallViewModel`: Manages a call session, timers per plan, speech in/out, OpenAI orchestration, conversation buffer, logging.
- `SettingsViewModel`: API key, instructions CRUD, plan selection, web search config.
- `AlarmViewModel`: Lists and edits alarms, requests permissions, schedules/cancels alarms.
- `LogsViewModel`: Reads/deletes call logs; detail presentation.

## Views
- `HomeView`: Start/End call, status, remaining time, current message, quick links to Settings/Logs/Alarms.
- `SettingsView`: API key entry (Keychain), instructions management, plan settings, web search config.
- `AlarmView`: Alarm list and editor (time, days, snooze).
- `LogsView` / `LogDetailView`: View and manage call logs.
- `RootView` (TabView) or NavigationStack; `MorningAssistantApp` is the App entry.

## Flows
- Start Call:
  1) Validate API key + active instructions.
  2) Start timer by plan; greet via TTS.
  3) Ask AI for initial step; speak response.
  4) Loop: listen once, send to AI with context and selected instructions; speak back; update log.
  5) On timeout or end, persist `CallLog`.
- Alarms:
  - iOS 18+: use AlarmKit when available.
  - Otherwise fallback to `UNUserNotificationCenter` and launch to auto-start the call if configured.

## Safety & Privacy
- API keys stored in Keychain, never logged.
- HTTPS enforced by default.
- Audio kept ephemeral; only computed text is saved into logs (unless disabled by plan).
- Errors surfaced with user-friendly messaging; retry for transient errors.

## Extensibility (MCP-inspired)
- Capability registry: central point to swap or extend providers (e.g., different AI backend, different search providers) without touching UI.
- Each capability has a clear protocol and default implementation; tests can inject mocks.

## Minimum Targets
- Swift 5.9+
- iOS 16.0+ (AlarmKit path guarded by availability checks)

## Open Items / Next
- Implement real WebSearch client for premium plan.
- Decide on Core Data vs JSON for logs at scale (start with JSON).
- Add unit tests for services and VMs.

