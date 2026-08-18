"use client"

import React, { Component, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  title?: string
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class SafeWidget extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SafeWidget caught an error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800">
              {this.props.title || "Khối nội dung đang được cập nhật"}
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Đã xảy ra sự cố hiển thị nhỏ. Các phần khác của trang vẫn hoạt động bình thường.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Tải lại khối này
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
