Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod }

function Await-WinRT($winRtAsyncOp) {
    $genericMethod = $asTaskGeneric[0].MakeGenericMethod($winRtAsyncOp.GetType().GetGenericArguments())
    $task = $genericMethod.Invoke($null, @($winRtAsyncOp))
    $task.Wait()
    return $task.Result
}

function Await-WinRTAction($winRtAsyncAction) {
    $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and -not $_.IsGenericMethod }
    $task = $asTaskMethod[0].Invoke($null, @($winRtAsyncAction))
    $task.Wait()
    return $task
}

# Create test slide
$testImagePath = "$PSScriptRoot\test_slide.jpg"
if (-not (Test-Path $testImagePath)) {
    $bmp = New-Object System.Drawing.Bitmap 1920, 1080
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(3, 20, 36))
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::SkyBlue)
    $font = New-Object System.Drawing.Font("Arial", 40, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("Sea Turtle Conservation DSS", $font, $brush, 100, 100)
    $g.Dispose()
    $bmp.Save($testImagePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bmp.Dispose()
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.CreationCollisionOption, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$imgFile = Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($testImagePath))
$clip = Await-WinRT ([Windows.Media.Editing.MediaClip]::CreateFromImageFileAsync($imgFile, [TimeSpan]::FromSeconds(3)))

$comp = New-Object Windows.Media.Editing.MediaComposition
$comp.Clips.Add($clip)

$parentFolder = Await-WinRT ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($PSScriptRoot))
$targetFile = Await-WinRT ([Windows.Storage.IStorageFolder].GetMethod("CreateFileAsync", [Type[]]@([string], [Windows.Storage.CreationCollisionOption])).Invoke($parentFolder, @("test_out.mp4", [Windows.Storage.CreationCollisionOption]::ReplaceExisting)))

$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD1080p)

Write-Host "Rendering MP4..."
$renderOp = $comp.RenderToFileAsync($targetFile, [Windows.Media.Editing.MediaTrimmingPreference]::Precise, $profile)
$renderTask = Await-WinRTAction $renderOp

$outPath = "$PSScriptRoot\test_out.mp4"
Write-Host "Done! File size: $((Get-Item $outPath).Length) bytes"
