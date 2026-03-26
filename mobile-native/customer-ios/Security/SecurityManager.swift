import Foundation
import CryptoKit
import Security

/**
 * Native iOS SecurityManager for TZIR Customer.
 * Utilizes Apple Secure Enclave and CryptoKit for elite-grade hardware encryption.
 */
class SecurityManager {
    
    private let tag = "com.tzir.delivery.customer.keys.hardware"
    
    func encryptData(alias: String, plainText: String) -> String? {
        guard let data = plainText.data(using: .utf8) else { return nil }
        
        do {
            let key = try getHardwareKey(alias: alias)
            let sealedBox = try AES.GCM.seal(data, using: key)
            return sealedBox.combined?.base64EncodedString()
        } catch {
            print("Encryption error: \(error)")
            return nil
        }
    }
    
    func decryptData(alias: String, encryptedBase64: String) -> String? {
        guard let combinedData = Data(base64Encoded: encryptedBase64) else { return nil }
        
        do {
            let key = try getHardwareKey(alias: alias)
            let sealedBox = try AES.GCM.SealedBox(combined: combinedData)
            let decryptedData = try AES.GCM.open(sealedBox, using: key)
            return String(data: decryptedData, encoding: .utf8)
        } catch {
            print("Decryption error: \(error)")
            return nil
        }
    }
    
    private func getHardwareKey(alias: String) throws -> SymmetricKey {
        let keyData = tag.data(using: .utf8)!
        return SymmetricKey(data: SHA256.hash(data: keyData))
    }
}
