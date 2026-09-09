Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Hàm lấy IP LAN chính xác
function Get-LocalIPAddress {
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
            $_.InterfaceAlias -notmatch 'Loopback|vEthernet|VirtualBox|VMware' -and 
            $_.IPAddress -notlike '169.254*' -and 
            $_.IPAddress -notlike '127.*'
        } | Select-Object -First 1).IPAddress
        if ($ip) { return $ip }
    } catch {}
    return "127.0.0.1"
}

# Hàm kiểm tra cổng 3000 đang chạy hay không
function Test-ServerRunning {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect("127.0.0.1", 3000, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if ($success) {
            $client.EndConnect($iar)
            $client.Close()
            return $true
        }
        $client.Close()
    } catch {}
    return $false
}

# Hàm tắt server
function Stop-SkylineServer {
    try {
        $pids = netstat -ano | Select-String ":3000.*LISTENING" | ForEach-Object {
            $parts = $_.Line.Trim() -split '\s+'
            $parts[-1]
        } | Select-Object -Unique
        
        foreach ($p in $pids) {
            if ($p -and $p -ne "0") {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# Hàm bật server
function Start-SkylineServer {
    if (-not (Test-ServerRunning)) {
        Start-Process "cmd.exe" -ArgumentList "/c `"$ScriptDir\start-server.bat`"" -WindowStyle Hidden -WorkingDirectory $ScriptDir
    }
}

# Kiểm tra shortcut trong thư mục Startup
function Test-AutoStartEnabled {
    $startupFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
    $shortcutPath = Join-Path $startupFolder "SkylineSurveyTray.lnk"
    return (Test-Path $shortcutPath)
}

# Bật/tắt tự khởi động cùng Windows
function Toggle-AutoStart($enable) {
    $startupFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
    $shortcutPath = Join-Path $startupFolder "SkylineSurveyTray.lnk"
    if ($enable) {
        $wsh = New-Object -ComObject WScript.Shell
        $sc = $wsh.CreateShortcut($shortcutPath)
        $sc.TargetPath = "wscript.exe"
        $sc.Arguments = "`"$ScriptDir\SkylineTray.vbs`""
        $sc.WorkingDirectory = $ScriptDir
        $sc.Description = "Skyline Survey System Tray"
        $sc.Save()
    } else {
        if (Test-Path $shortcutPath) {
            Remove-Item $shortcutPath -Force -ErrorAction SilentlyContinue
        }
    }
}

# Tạo Icon khay hệ thống
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$iconPath = Join-Path $ScriptDir "public\favicon.ico"
if (Test-Path $iconPath) {
    $notifyIcon.Icon = New-Object System.Drawing.Icon($iconPath)
} else {
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}
$notifyIcon.Visible = $true

# Context Menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip
$contextMenu.RenderMode = [System.Windows.Forms.ToolStripRenderMode]::System

# Header Title
$menuTitle = New-Object System.Windows.Forms.ToolStripMenuItem
$menuTitle.Text = "🏫 SKYLINE SURVEY SYSTEM"
$menuTitle.Font = New-Object System.Drawing.Font($contextMenu.Font, [System.Drawing.FontStyle]::Bold)
$menuTitle.Enabled = $false
$contextMenu.Items.Add($menuTitle) | Out-Null

# Status item
$menuStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStatus.Text = "Trạng thái: Đang kiểm tra..."
$menuStatus.Add_Click({
    Update-SystemStatus
})
$contextMenu.Items.Add($menuStatus) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Mở Login
$menuOpenLogin = New-Object System.Windows.Forms.ToolStripMenuItem
$menuOpenLogin.Text = "🌐 Mở trang Đăng nhập"
$menuOpenLogin.Font = New-Object System.Drawing.Font($contextMenu.Font, [System.Drawing.FontStyle]::Bold)
$menuOpenLogin.Add_Click({
    $ip = Get-LocalIPAddress
    [System.Diagnostics.Process]::Start("http://${ip}:3000/login")
})
$contextMenu.Items.Add($menuOpenLogin) | Out-Null

# Mở Admin Portal
$menuOpenAdmin = New-Object System.Windows.Forms.ToolStripMenuItem
$menuOpenAdmin.Text = "📊 Mở trang Quản trị (Admin)"
$menuOpenAdmin.Add_Click({
    $ip = Get-LocalIPAddress
    [System.Diagnostics.Process]::Start("http://${ip}:3000/admin")
})
$contextMenu.Items.Add($menuOpenAdmin) | Out-Null

# Copy link chia sẻ
$menuCopyLink = New-Object System.Windows.Forms.ToolStripMenuItem
$menuCopyLink.Text = "📋 Sao chép Link gửi Giáo viên"
$menuCopyLink.Add_Click({
    $ip = Get-LocalIPAddress
    $link = "http://${ip}:3000/login"
    [System.Windows.Forms.Clipboard]::SetText($link)
    $notifyIcon.ShowBalloonTip(2000, "Đã sao chép!", "Link đăng nhập: $link", [System.Windows.Forms.ToolTipIcon]::Info)
})
$contextMenu.Items.Add($menuCopyLink) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Start server
$menuStart = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStart.Text = "▶️ Bật Server"
$menuStart.Add_Click({
    Start-SkylineServer
    $notifyIcon.ShowBalloonTip(2500, "Skyline Server", "Đang khởi động Server...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Sleep -Milliseconds 800
    Update-SystemStatus
})
$contextMenu.Items.Add($menuStart) | Out-Null

# Restart server
$menuRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$menuRestart.Text = "🔄 Khởi động lại Server (Restart)"
$menuRestart.Add_Click({
    Stop-SkylineServer
    Start-Sleep -Milliseconds 1000
    Start-SkylineServer
    $notifyIcon.ShowBalloonTip(2500, "Skyline Server", "Đang khởi động lại Server...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Sleep -Milliseconds 800
    Update-SystemStatus
})
$contextMenu.Items.Add($menuRestart) | Out-Null

# Build lại hệ thống (Update/Rebuild)
$menuBuild = New-Object System.Windows.Forms.ToolStripMenuItem
$menuBuild.Text = "🔨 Cập nhật & Build lại hệ thống (Build)"
$menuBuild.Add_Click({
    $notifyIcon.ShowBalloonTip(3000, "Skyline Server", "Đang tiến hành build & cập nhật hệ thống...", [System.Windows.Forms.ToolTipIcon]::Info)
    Start-Process "cmd.exe" -ArgumentList "/c `"cd /d `"$ScriptDir`" && npm run build && call `"$ScriptDir\tat-server.bat`" && start `"`" `"$ScriptDir\start-server.bat`"`"" -WorkingDirectory $ScriptDir
})
$contextMenu.Items.Add($menuBuild) | Out-Null

# Stop server
$menuStop = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStop.Text = "⏹️ Tắt Server"
$menuStop.Add_Click({
    Stop-SkylineServer
    $notifyIcon.ShowBalloonTip(2000, "Skyline Server", "Đã tắt Server thành công.", [System.Windows.Forms.ToolTipIcon]::Warning)
    Start-Sleep -Milliseconds 500
    Update-SystemStatus
})
$contextMenu.Items.Add($menuStop) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Xem Log
$menuLog = New-Object System.Windows.Forms.ToolStripMenuItem
$menuLog.Text = "📜 Xem Nhật ký hoạt động (Log)"
$menuLog.Add_Click({
    $logFile = Join-Path $ScriptDir "server.log"
    if (-not (Test-Path $logFile)) {
        "" | Out-File $logFile -Encoding utf8
    }
    [System.Diagnostics.Process]::Start("notepad.exe", "`"$logFile`"")
})
$contextMenu.Items.Add($menuLog) | Out-Null

# Mở thư mục
$menuFolder = New-Object System.Windows.Forms.ToolStripMenuItem
$menuFolder.Text = "📂 Mở Thư mục dự án"
$menuFolder.Add_Click({
    [System.Diagnostics.Process]::Start("explorer.exe", "`"$ScriptDir`"")
})
$contextMenu.Items.Add($menuFolder) | Out-Null

# Tự khởi động cùng Windows
$menuAutoStart = New-Object System.Windows.Forms.ToolStripMenuItem
$menuAutoStart.Text = "⚙️ Tự khởi động cùng Windows"
$menuAutoStart.CheckOnClick = $true
$menuAutoStart.Checked = (Test-AutoStartEnabled)
$menuAutoStart.Add_CheckedChanged({
    Toggle-AutoStart $menuAutoStart.Checked
    if ($menuAutoStart.Checked) {
        $notifyIcon.ShowBalloonTip(2000, "Tự động khởi động", "Đã bật tự khởi động tiện ích cùng Windows.", [System.Windows.Forms.ToolTipIcon]::Info)
    } else {
        $notifyIcon.ShowBalloonTip(2000, "Tự động khởi động", "Đã tắt tự khởi động cùng Windows.", [System.Windows.Forms.ToolTipIcon]::Info)
    }
})
$contextMenu.Items.Add($menuAutoStart) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Thoát tiện ích
$menuExit = New-Object System.Windows.Forms.ToolStripMenuItem
$menuExit.Text = "❌ Thoát Tiện ích (Không tắt Server)"
$menuExit.Add_Click({
    $timer.Stop()
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})
$contextMenu.Items.Add($menuExit) | Out-Null

$notifyIcon.ContextMenuStrip = $contextMenu

# Double click vào icon -> Mở trang login
$notifyIcon.Add_DoubleClick({
    $ip = Get-LocalIPAddress
    [System.Diagnostics.Process]::Start("http://${ip}:3000/login")
})

# Hàm cập nhật trạng thái UI
function Update-SystemStatus {
    $isRunning = Test-ServerRunning
    $ip = Get-LocalIPAddress
    
    if ($isRunning) {
        $menuStatus.Text = "Trạng thái: Đang hoạt động 🟢"
        $menuStatus.ForeColor = [System.Drawing.Color]::ForestGreen
        $notifyIcon.Text = "Skyline Survey (🟢 Đang chạy: $ip:3000)"
        $menuStart.Enabled = $false
        $menuStop.Enabled = $true
        $menuRestart.Enabled = $true
    } else {
        $menuStatus.Text = "Trạng thái: Đã dừng 🔴"
        $menuStatus.ForeColor = [System.Drawing.Color]::Crimson
        $notifyIcon.Text = "Skyline Survey (🔴 Đã dừng)"
        $menuStart.Enabled = $true
        $menuStop.Enabled = $false
        $menuRestart.Enabled = $false
    }
}

# Timer định kỳ kiểm tra trạng thái mỗi 5 giây
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({
    Update-SystemStatus
})
$timer.Start()

# Chạy lần đầu
Update-SystemStatus

# Nếu server chưa chạy, tự khởi động server
if (-not (Test-ServerRunning)) {
    Start-SkylineServer
    Start-Sleep -Milliseconds 1500
    Update-SystemStatus
}

# Thông báo khi mở tiện ích
$currentIP = Get-LocalIPAddress
$notifyIcon.ShowBalloonTip(3000, "Skyline Survey Utility", "Tiện ích khay hệ thống đã sẵn sàng!`nIP: http://$currentIP:3000/login", [System.Windows.Forms.ToolTipIcon]::Info)

# Chạy vòng lặp sự kiện Windows Forms
[System.Windows.Forms.Application]::Run()
