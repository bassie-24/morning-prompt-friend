import SwiftUI

struct HomeView: View {
    @EnvironmentObject var registry: CapabilityRegistry
    @StateObject private var vmHolder = Holder()

    private final class Holder: ObservableObject {
        var vm: CallViewModel?
    }

    var body: some View {
        let vm = ensureVM()
        VStack(spacing: 16) {
            Text(vm.currentMessage.isEmpty ? "通話を開始する準備ができました" : vm.currentMessage)
                .font(.body)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)

            if vm.isActive {
                HStack(spacing: 8) {
                    Image(systemName: "clock")
                    Text("残り: \(formatTime(vm.remainingSeconds))")
                        .font(.headline)
                        .foregroundColor(vm.remainingSeconds <= 30 ? .red : .secondary)
                }
            }

            Button(action: { Task { await toggleCall(vm) } }) {
                VStack { Image(systemName: vm.isActive ? "phone.down.circle.fill" : "phone.circle.fill").resizable().frame(width: 96, height: 96)
                    Text(vm.isActive ? "通話終了" : "通話開始") }
            }
            .buttonStyle(.plain)
            .padding(8)

            if vm.isActive {
                HStack {
                    Label(vm.isListening ? "音声認識中" : "待機中", systemImage: vm.isListening ? "mic.fill" : "mic.slash")
                    Spacer()
                    if vm.isSpeaking { Label("AIが話しています", systemImage: "speaker.wave.2.fill") }
                }.foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .navigationTitle("朝のAIアシスタント")
    }

    private func formatTime(_ s: Int) -> String { String(format: "%d:%02d", s/60, s%60) }

    private func toggleCall(_ vm: CallViewModel) async {
        if vm.isActive { vm.stop() }
        else { await vm.start(plan: registry.storage.getPlan(), instructions: registry.storage.loadInstructions()) }
    }

    private func ensureVM() -> CallViewModel {
        if let vm = vmHolder.vm { return vm }
        let newVM = CallViewModel(registry: registry)
        vmHolder.vm = newVM
        return newVM
    }
}

