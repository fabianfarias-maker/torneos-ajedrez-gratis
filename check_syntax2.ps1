$lines = [IO.File]::ReadAllLines("index.html")

# Find where the main script starts
$scriptStartLine = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Trim() -eq "<script>" -and $i -lt 3000) {
        $scriptStartLine = $i
        break
    }
}

Write-Output "Main script starts at HTML line: $($scriptStartLine + 1)"

# Now track brace balance line by line within the script
$braceDepth = 0
$maxDepth = 0
$scriptLineNum = 0
$inScript = $false
$problems = @()

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $htmlLine = $i + 1
    
    if ($line.Trim() -eq "<script>" -and $htmlLine -le 3000) {
        $inScript = $true
        continue
    }
    if ($line.Trim() -eq "</script>" -and $inScript) {
        if ($braceDepth -ne 0) {
            $problems += "At </script> (HTML line $htmlLine), brace depth is $braceDepth (should be 0)"
        }
        $inScript = $false
        continue
    }
    
    if (-not $inScript) { continue }
    
    $scriptLineNum++
    
    # Count braces on this line (simple count, ignoring strings/comments for now)
    $openCount = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeCount = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    
    $prevDepth = $braceDepth
    $braceDepth += $openCount - $closeCount
    
    if ($braceDepth -lt 0) {
        $problems += "HTML line $htmlLine (script line $scriptLineNum): brace depth went NEGATIVE ($braceDepth). Line content: $($line.Trim().Substring(0, [Math]::Min(100, $line.Trim().Length)))"
        # Don't reset, keep tracking
    }
    
    if ($braceDepth -gt $maxDepth) { $maxDepth = $braceDepth }
}

Write-Output "Max brace depth: $maxDepth"
Write-Output "Final brace depth: $braceDepth"

if ($problems.Count -gt 0) {
    Write-Output "`n=== PROBLEMS FOUND ==="
    foreach ($p in $problems) {
        Write-Output $p
    }
} else {
    Write-Output "`nNo brace problems found!"
}

# Now let's also look for function definitions and their brace tracking
Write-Output "`n=== FUNCTION BRACE TRACKING ==="
$inScript2 = $false
$braceDepth2 = 0
$currentFunc = ""

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $htmlLine = $i + 1
    
    if ($line.Trim() -eq "<script>" -and $htmlLine -le 3000) { $inScript2 = $true; continue }
    if ($line.Trim() -eq "</script>" -and $inScript2) { $inScript2 = $false; continue }
    if (-not $inScript2) { continue }
    
    # Check for function declaration
    if ($line -match 'function\s+(\w+)\s*\(') {
        $funcName = $Matches[1]
        if ($braceDepth2 -eq 0) {
            $currentFunc = $funcName
            Write-Output "Function '$funcName' starts at HTML line $htmlLine (depth $braceDepth2)"
        }
    }
    
    $openCount = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeCount = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    $braceDepth2 += $openCount - $closeCount
    
    if ($braceDepth2 -lt 0) {
        Write-Output "  *** NEGATIVE depth at HTML line $htmlLine in/after function '$currentFunc': depth=$braceDepth2"
        Write-Output "  *** Line: $($line.Trim().Substring(0, [Math]::Min(120, $line.Trim().Length)))"
    }
}
