import SwiftUI

struct CapturePopupView: View {
    let image: NSImage
    let onSend: (String) -> Void
    let onCancel: () -> Void

    @State private var contextText = ""
    @State private var isSending = false

    var body: some View {
        VStack(spacing: 16) {
            // Screenshot preview
            Image(nsImage: image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(maxHeight: 160)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )

            // Context text input
            VStack(alignment: .leading, spacing: 4) {
                Text("Add context (optional)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("e.g., 'Reply to this email' or 'Schedule this meeting'", text: $contextText)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        send()
                    }
            }

            // Action buttons
            HStack {
                Button("Cancel") {
                    onCancel()
                }
                .keyboardShortcut(.cancelAction)

                Spacer()

                Button(action: send) {
                    if isSending {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 16, height: 16)
                    } else {
                        Text("Send")
                    }
                }
                .keyboardShortcut(.defaultAction)
                .disabled(isSending)
            }
        }
        .padding(20)
        .frame(width: 400)
    }

    private func send() {
        isSending = true
        onSend(contextText)
    }
}
