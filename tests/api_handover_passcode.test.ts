import { describe, it, expect } from "vitest"
import {
  generateDeliveryPasscode,
  encryptApiKeyWithPasscode,
  decryptApiKeyWithPasscode,
} from "@/lib/api-handover"

describe("API Delivery Passcode & Encrypted Handover (Nghị định 13/2023)", () => {
  const SAMPLE_API_KEY = "sky_live_8f7e6d5c4b3a210987654321fedcba09"

  it("generates a valid passcode with SL- prefix and 6 digits", () => {
    const code = generateDeliveryPasscode()
    expect(code).toMatch(/^SL-\d{6}$/)
  })

  it("encrypts and successfully decrypts with correct passcode (AES-256-GCM)", () => {
    const passcode = "SL-849201"
    const enc = encryptApiKeyWithPasscode(SAMPLE_API_KEY, passcode)

    expect(enc.encryptedKey).toBeTruthy()
    expect(enc.salt).toBeTruthy()
    expect(enc.iv).toBeTruthy()
    expect(enc.authTag).toBeTruthy()

    const dec = decryptApiKeyWithPasscode(
      enc.encryptedKey,
      passcode,
      enc.salt,
      enc.iv,
      enc.authTag
    )

    expect(dec.success).toBe(true)
    expect(dec.rawKey).toBe(SAMPLE_API_KEY)
  })

  it("fails to decrypt with incorrect passcode", () => {
    const correctPasscode = "SL-849201"
    const wrongPasscode = "SL-999999"

    const enc = encryptApiKeyWithPasscode(SAMPLE_API_KEY, correctPasscode)

    const dec = decryptApiKeyWithPasscode(
      enc.encryptedKey,
      wrongPasscode,
      enc.salt,
      enc.iv,
      enc.authTag
    )

    expect(dec.success).toBe(false)
    expect(dec.rawKey).toBeUndefined()
    expect(dec.error).toContain("Mật khẩu bảo vệ không chính xác")
  })

  it("handles whitespace and case-insensitivity on passcode trimming", () => {
    const passcode = "  SL-123456  "
    const enc = encryptApiKeyWithPasscode(SAMPLE_API_KEY, passcode)

    const dec = decryptApiKeyWithPasscode(
      enc.encryptedKey,
      "SL-123456",
      enc.salt,
      enc.iv,
      enc.authTag
    )

    expect(dec.success).toBe(true)
    expect(dec.rawKey).toBe(SAMPLE_API_KEY)
  })
})
