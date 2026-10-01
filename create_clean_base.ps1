Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "public/cracha_modelo_referencia.jpg"
$outPath = Join-Path $PSScriptRoot "public/cracha_base_perfect.png"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, 0, 0, $src.Width, $src.Height)

$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# Clear ONLY the value texts (keep original header, labels, icons and footer 100% intact!)
# Box 1: Nome (y: 220 to 258)
$g.FillRectangle($brush, 150, 220, 800, 38)

# Box 2: Escola (y: 290 to 328)
$g.FillRectangle($brush, 150, 290, 800, 38)

# Box 3: Turma (y: 360 to 398)
$g.FillRectangle($brush, 150, 360, 800, 38)

# Box 4a: Alergia (y: 430 to 468)
$g.FillRectangle($brush, 150, 430, 410, 38)

# Box 4b: Sangue (y: 430 to 468)
$g.FillRectangle($brush, 660, 430, 290, 38)

# Box 5: Contato (y: 500 to 538)
$g.FillRectangle($brush, 150, 500, 800, 38)

# Box 6: Diretor (y: 570 to 608)
$g.FillRectangle($brush, 150, 570, 290, 38)

$g.Dispose()
$brush.Dispose()
$src.Dispose()

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "cracha_base_perfect.png generated with perfect fidelity!"
