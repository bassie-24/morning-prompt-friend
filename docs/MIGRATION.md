# Migration — PWA/Capacitor to Native Swift

## Mapping (Pages → Views)
- `src/pages/Index.tsx` → `HomeView` + `CallViewModel`
- `src/pages/Settings.tsx` → `SettingsView` + `SettingsViewModel`
- `src/pages/Alarm.tsx` → `AlarmView` + `AlarmViewModel`
- `src/pages/CallLog.tsx` → `LogsView` / `LogDetailView` + `LogsViewModel`
- `src/components/WebSearchTest.tsx` → `WebSearchClient` preview hooks in Settings

## Mapping (Services → Capabilities)
- `CapacitorSpeechService` + `utils/speechService` → `SpeechRecognizerService` + `SpeechSynthesizerService`
- `AlarmKitService` → `AlarmScheduler` protocol with `AlarmKitScheduler` (iOS 18+) and `LocalNotificationScheduler` fallback
- `NotificationService` (web) → `LocalNotificationScheduler`
- `WebSearchService` → `WebSearchClient` (pluggable; stubbed by plan)
- `storageService` (localStorage) → `StorageService` (UserDefaults) + `CallLogStore` (JSON)
- Plan context → `Plan` model + policy checks in VMs

## Data
- Preserve shapes in `要件定義書.md` models (ids become UUID).
- Logs stored as JSON initially; evolvable to Core Data.
- API keys moved from storage to Keychain.

## Alarm Behavior
- iOS 18+: AlarmKit with proper authorization.
- Fallback: `UNUserNotificationCenter` + app launch; optional auto-call on launch.

## Phased Cutover
- Phase 1: Build Swift app core (speech in/out, OpenAI, basic UI, JSON logs, fallback alarms).
- Phase 2: Port data & settings; enable plan enforcement; add alarm UI.
- Phase 3: Add AlarmKit code path (guarded by availability); refine error handling.
- Phase 4: Premium web search; polish UX & accessibility.

## Decommission
- Retain PWA assets during transition for reference only.
- New app code lives in `NativeApp/MorningAssistant/`.
- Once native app reaches parity, remove Capacitor iOS project and web runtime.

