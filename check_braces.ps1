$content = [IO.File]::ReadAllText("index.html")
$stack = New-Object System.Collections.Stack
$line = 1
for ($i = 0; $i -lt $content.Length; $i++) {
    $c = $content[$i]
    if ($c -eq "`n") { $line++ }
    if ($c -eq '{') {
        $stack.Push($line)
    } elseif ($c -eq '}') {
        if ($stack.Count -eq 0) {
            Write-Output "Unmatched '}' at line $line"
        } else {
            $null = $stack.Pop()
        }
    }
}
if ($stack.Count -gt 0) {
    Write-Output "Unmatched '{' found at lines: "
    while ($stack.Count -gt 0) {
        Write-Output $stack.Pop()
    }
} else {
    Write-Output "Braces are balanced!"
}
