Add-Type -AssemblyName System.Drawing

function Generate-StrideIcon {
    param(
        [int]$size,
        [string]$outputPath,
        [bool]$isForeground = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isForeground) {
        # Transparent background for adaptive icon foreground
        $graphics.Clear([System.Drawing.Color]::Transparent)
        # Adaptive icon safe-zone is center ~66% of the icon
        $scale = $size * 0.58
        $offsetX = ($size - $scale) / 2
        $offsetY = ($size - $scale) / 2
    } else {
        # Solid Pure White Background
        $graphics.Clear([System.Drawing.Color]::White)
        $scale = $size * 0.70
        $offsetX = ($size - $scale) / 2
        $offsetY = ($size - $scale) / 2
    }

    # Helper function to scale coordinates from [0..100] viewBox
    function Map-Pt($x, $y) {
        $realX = [float]($offsetX + ($x / 100.0) * $scale)
        $realY = [float]($offsetY + ($y / 100.0) * $scale)
        return New-Object System.Drawing.PointF $realX, $realY
    }

    # Stripe 1: points="12,88 42,12 64,12 34,88"
    $p1 = @(
        (Map-Pt 12 88),
        (Map-Pt 42 12),
        (Map-Pt 64 12),
        (Map-Pt 34 88)
    )
    $brush1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
    $graphics.FillPolygon($brush1, $p1)

    # Stripe 2: points="46,88 76,12 96,12 66,88"
    $p2 = @(
        (Map-Pt 46 88),
        (Map-Pt 76 12),
        (Map-Pt 96 12),
        (Map-Pt 66 88)
    )
    $brush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 16, 185, 129))
    $graphics.FillPolygon($brush2, $p2)

    # Ensure parent dir exists
    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

$baseRes = "c:\Users\shivansh\Desktop\STRIDE\mobile\android\app\src\main\res"

# Generate Legacy Icons & Round Icons (White background + two green stripes)
Generate-StrideIcon 48 "$baseRes\mipmap-mdpi\ic_launcher.png" $false
Generate-StrideIcon 48 "$baseRes\mipmap-mdpi\ic_launcher_round.png" $false
Generate-StrideIcon 72 "$baseRes\mipmap-hdpi\ic_launcher.png" $false
Generate-StrideIcon 72 "$baseRes\mipmap-hdpi\ic_launcher_round.png" $false
Generate-StrideIcon 96 "$baseRes\mipmap-xhdpi\ic_launcher.png" $false
Generate-StrideIcon 96 "$baseRes\mipmap-xhdpi\ic_launcher_round.png" $false
Generate-StrideIcon 144 "$baseRes\mipmap-xxhdpi\ic_launcher.png" $false
Generate-StrideIcon 144 "$baseRes\mipmap-xxhdpi\ic_launcher_round.png" $false
Generate-StrideIcon 192 "$baseRes\mipmap-xxxhdpi\ic_launcher.png" $false
Generate-StrideIcon 192 "$baseRes\mipmap-xxxhdpi\ic_launcher_round.png" $false

# Generate Adaptive Icon Foregrounds (Transparent with scaled stripes)
Generate-StrideIcon 108 "$baseRes\mipmap-mdpi\ic_launcher_foreground.png" $true
Generate-StrideIcon 162 "$baseRes\mipmap-hdpi\ic_launcher_foreground.png" $true
Generate-StrideIcon 216 "$baseRes\mipmap-xhdpi\ic_launcher_foreground.png" $true
Generate-StrideIcon 324 "$baseRes\mipmap-xxhdpi\ic_launcher_foreground.png" $true
Generate-StrideIcon 432 "$baseRes\mipmap-xxxhdpi\ic_launcher_foreground.png" $true

# Also update web public icons
$pub = "c:\Users\shivansh\Desktop\STRIDE\mobile\public"
Generate-StrideIcon 192 "$pub\icon-192.png" $false
Generate-StrideIcon 512 "$pub\icon-512.png" $false
Generate-StrideIcon 512 "$pub\icon.png" $false

Write-Host "ALL WHITE BACKGROUND ICONS GENERATED SUCCESSFULLY!"
