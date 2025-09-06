import SwiftUI

struct AlarmView: View {
    @EnvironmentObject var registry: CapabilityRegistry
    @StateObject private var vmHolder = Holder()
    @State private var time: String = "07:00"
    @State private var label: String = "朝の準備"

    private final class Holder: ObservableObject { var vm: AlarmViewModel? }

    var body: some View {
        let vm = ensureVM()
        Form {
            Section("権限") {
                HStack {
                    Text(vm.authorized ? "許可済み" : "未許可").foregroundStyle(vm.authorized ? .green : .red)
                    Spacer()
                    Button("権限をリクエスト") { Task { await vm.requestAuthorization() } }
                }
            }
            Section("アラーム追加") {
                TextField("時刻 (HH:mm)", text: $time)
                TextField("ラベル", text: $label)
                Button("スケジュール") {
                    let alarm = AlarmSettings(enabled: true, time: time, days: [1,2,3,4,5], label: label, snooze: false, snoozeDuration: 5)
                    Task { await vm.schedule(alarm) }
                }
            }
        }
        .navigationTitle("アラーム")
    }

    private func ensureVM() -> AlarmViewModel {
        if let vm = vmHolder.vm { return vm }
        let newVM = AlarmViewModel(registry: registry)
        vmHolder.vm = newVM
        return newVM
    }
}

