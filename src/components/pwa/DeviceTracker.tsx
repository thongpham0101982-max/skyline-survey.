"use client"

import { useEffect, useRef } from "react"
import { signOut } from "next-auth/react"

function parseDeviceInfo() {
  if (typeof window === "undefined") return { deviceName: "Web", deviceType: "MOBILE", browser: "Browser", os: "OS" }

  const ua = navigator.userAgent
  let deviceType: "MOBILE" | "TABLET" | "DESKTOP" = "MOBILE"
  let os = "Khác"
  let browser = "Trình duyệt"

  if (/iPhone/i.test(ua)) {
    os = "iOS"
    deviceType = "MOBILE"
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS"
    deviceType = "TABLET"
  } else if (/Android/i.test(ua)) {
    os = "Android"
    deviceType = /Tablet|Nexus 7|Nexus 9/i.test(ua) ? "TABLET" : "MOBILE"
  } else if (/Windows/i.test(ua)) {
    os = "Windows"
    deviceType = "DESKTOP"
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    os = "macOS"
    deviceType = "DESKTOP"
  } else if (/Linux/i.test(ua)) {
    os = "Linux"
    deviceType = "DESKTOP"
  }

  if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge"
  } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = "Google Chrome"
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Apple Safari"
  } else if (/Firefox/i.test(ua)) {
    browser = "Mozilla Firefox"
  }

  let deviceName = ""
  if (os === "iOS") deviceName = "Apple iPhone"
  else if (os === "iPadOS") deviceName = "Apple iPad"
  else if (os === "Android") deviceName = "Thiết bị Android"
  else if (os === "Windows") deviceName = "Máy tính Windows"
  else if (os === "macOS") deviceName = "Máy tính Apple Mac"
  else deviceName = "Trình duyệt Web"

  return { deviceName, deviceType, browser, os }
}

export function DeviceTracker() {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || registeredRef.current) return
    registeredRef.current = true

    let deviceId = localStorage.getItem("ssm_device_id")
    if (!deviceId) {
      deviceId = "ssm_dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36)
      localStorage.setItem("ssm_device_id", deviceId)
    }

    const { deviceName, deviceType, browser, os } = parseDeviceInfo()

    const syncDevice = async () => {
      try {
        const res = await fetch("/api/pwa/devices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId!
          },
          body: JSON.stringify({
            deviceId,
            deviceName,
            deviceType,
            browser,
            os
          })
        })

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}))
          if (data.revoked) {
            alert("Phiên đăng nhập trên thiết bị này đã bị thu hồi từ xa. Vui lòng đăng nhập lại.")
            signOut({ callbackUrl: "/login?revoked=1" })
          }
        }
      } catch (e) {
        // Silently tolerate
      }
    }

    syncDevice()

    const interval = setInterval(syncDevice, 10 * 60 * 1000)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncDevice()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  return null
}
