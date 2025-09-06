# Morning AI Assistant — Progress

## Status (Initial Native Migration)
- Read and aligned with `要件定義書.md`.
- Planned architecture: SwiftUI + MVVM + capability registry (MCP-inspired).
- Created design document `docs/DESIGN-swift.md`.
- Scaffolding native Swift sources under `NativeApp/MorningAssistant/` (views, view models, services, models).
- Alarm strategy: AlarmKit (iOS 18+) with UNUserNotificationCenter fallback.

## Next Steps
- Flesh out `OpenAIClient` request/response and error handling.
- Implement continuous listen/respond loop with throttling and retry.
- Implement `LogsView` and `LogDetailView` functionality.
- Build out `AlarmViewModel` with CRUD and scheduling.
- Wire `Plan` enforcement (time limits, log visibility, web search gating).

## Risks / Considerations
- AlarmKit availability and entitlements on target iOS.
- Mic permissions and recognizer locale handling.
- Rate limits / timeouts for AI backend.
- Data persistence choice evolution (JSON -> Core Data if needed).

## Done When
- App starts and can:
  - Save API key, create/edit instructions.
  - Start/stop call, speak initial guidance, listen once, respond via AI.
  - Save a call log and display it.
  - Schedule a basic alarm w/ fallback.

