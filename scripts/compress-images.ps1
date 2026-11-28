param(
  [Parameter(Mandatory=$true)][string]$ManifestPath,
  [int]$MaxSize = 600,
  [int]$Quality = 82
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Apply-ExifOrientation {
  param([System.Drawing.Image]$Img)
  $propId = 0x0112
  if ($Img.PropertyIdList -contains $propId) {
    $prop = $Img.GetPropertyItem($propId)
    $orientation = [BitConverter]::ToUInt16($prop.Value, 0)
    switch ($orientation) {
      2 { $Img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
      3 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      4 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
      5 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
      6 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      7 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
      8 { $Img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
    try { $Img.RemovePropertyItem($propId) } catch {}
  }
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$items = Get-Content -Path $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($items -isnot [System.Array]) {
  $items = @($items)
}

$okCount = 0
$errCount = 0

foreach ($item in $items) {
  $src = $item.src
  $dst = $item.dst
  try {
    $bytes = [System.IO.File]::ReadAllBytes($src)
    $ms = New-Object System.IO.MemoryStream(,$bytes)
    $img = [System.Drawing.Image]::FromStream($ms)
    try {
      Apply-ExifOrientation -Img $img

      $w = $img.Width
      $h = $img.Height
      $newW = $w
      $newH = $h

      if ($w -gt $MaxSize -or $h -gt $MaxSize) {
        if ($w -ge $h) {
          $newW = $MaxSize
          $newH = [int][Math]::Round($h * ($MaxSize / [double]$w))
        } else {
          $newH = $MaxSize
          $newW = [int][Math]::Round($w * ($MaxSize / [double]$h))
        }
      }
      if ($newW -lt 1) { $newW = 1 }
      if ($newH -lt 1) { $newH = 1 }

      $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
      try {
        $bmp.SetResolution(96, 96)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
          $g.Clear([System.Drawing.Color]::White)
          $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g.DrawImage($img, 0, 0, $newW, $newH)
        } finally {
          $g.Dispose()
        }

        $dstDir = [System.IO.Path]::GetDirectoryName($dst)
        if (-not [System.IO.Directory]::Exists($dstDir)) {
          [System.IO.Directory]::CreateDirectory($dstDir) | Out-Null
        }
        $bmp.Save($dst, $jpegCodec, $encParams)
        $okCount++
      } finally {
        $bmp.Dispose()
      }
    } finally {
      $img.Dispose()
      $ms.Dispose()
    }
  } catch {
    $errCount++
    [Console]::Error.WriteLine("ERR|$src|$($_.Exception.Message)")
  }
}

Write-Output "DONE|$okCount|$errCount"
