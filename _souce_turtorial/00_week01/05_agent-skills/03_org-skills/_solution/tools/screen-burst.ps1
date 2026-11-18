param([string]$dir,[int]$n=150,[int]$ms=500)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $dir | Out-Null
$w=2448;$h=1377
for($i=0;$i -lt $n;$i++){
  $b=New-Object System.Drawing.Bitmap $w,$h; $g=[System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen(0,0,0,0,(New-Object System.Drawing.Size $w,$h))
  $b.Save(("{0}/b{1:D4}.png" -f $dir,$i),[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose()
  Add-Content "$dir/times.txt" ("{0:D4} {1}" -f $i,(Get-Date -Format 'HH:mm:ss.fff'))
  Start-Sleep -Milliseconds $ms
}
