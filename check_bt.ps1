$content = [IO.File]::ReadAllText("index.html")
$count = 0
foreach ($c in $content.ToCharArray()) {
    if ($c -eq [char]96) {
        $count++
    }
}
Write-Output "Backtick count: $count"
if ($count % 2 -ne 0) {
    Write-Output "WARNING: Odd number of backticks!"
}
