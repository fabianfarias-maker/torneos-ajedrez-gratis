$content = [IO.File]::ReadAllText("index.html")

# Extract the main script block between <script> and </script>
# Find the first <script> tag that doesn't have a src attribute
$scriptStart = $content.IndexOf("<script>")
$scriptEnd = $content.IndexOf("</script>")

if ($scriptStart -ge 0 -and $scriptEnd -ge 0) {
    $scriptContent = $content.Substring($scriptStart + 8, $scriptEnd - $scriptStart - 8)
    
    # Check parentheses balance
    $parenOpen = 0
    $parenClose = 0
    $braceOpen = 0
    $braceClose = 0
    $bracketOpen = 0
    $bracketClose = 0
    $backtickCount = 0
    
    $lineNum = 1
    $inString = $false
    $stringChar = ''
    $inTemplate = 0
    $inLineComment = $false
    $inBlockComment = $false
    
    $parenStack = New-Object System.Collections.Stack
    $braceStack = New-Object System.Collections.Stack
    $bracketStack = New-Object System.Collections.Stack
    
    for ($i = 0; $i -lt $scriptContent.Length; $i++) {
        $c = $scriptContent[$i]
        $prev = if ($i -gt 0) { $scriptContent[$i-1] } else { '' }
        
        if ($c -eq "`n") { 
            $lineNum++
            $inLineComment = $false
        }
        
        if ($inLineComment) { continue }
        if ($inBlockComment) {
            if ($c -eq '/' -and $prev -eq '*') { $inBlockComment = $false }
            continue
        }
        
        # Detect comments
        if (-not $inString -and $inTemplate -eq 0) {
            if ($c -eq '/' -and $i+1 -lt $scriptContent.Length -and $scriptContent[$i+1] -eq '/') {
                $inLineComment = $true
                continue
            }
            if ($c -eq '/' -and $i+1 -lt $scriptContent.Length -and $scriptContent[$i+1] -eq '*') {
                $inBlockComment = $true
                continue
            }
        }
        
        if ($c -eq '(') { $parenOpen++; $parenStack.Push($lineNum) }
        if ($c -eq ')') { 
            $parenClose++
            if ($parenStack.Count -gt 0) { $null = $parenStack.Pop() }
            else { Write-Output "ERROR: Unmatched ')' at script line $lineNum" }
        }
        if ($c -eq '{') { $braceOpen++; $braceStack.Push($lineNum) }
        if ($c -eq '}') { 
            $braceClose++
            if ($braceStack.Count -gt 0) { $null = $braceStack.Pop() }
            else { Write-Output "ERROR: Unmatched '}' at script line $lineNum" }
        }
        if ($c -eq '[') { $bracketOpen++; $bracketStack.Push($lineNum) }
        if ($c -eq ']') { 
            $bracketClose++
            if ($bracketStack.Count -gt 0) { $null = $bracketStack.Pop() }
            else { Write-Output "ERROR: Unmatched ']' at script line $lineNum" }
        }
        if ($c -eq [char]96) { $backtickCount++ }
    }
    
    Write-Output "=== SYNTAX BALANCE CHECK ==="
    Write-Output "Parentheses: ( = $parenOpen, ) = $parenClose, diff = $($parenOpen - $parenClose)"
    Write-Output "Braces: { = $braceOpen, } = $braceClose, diff = $($braceOpen - $braceClose)"  
    Write-Output "Brackets: [ = $bracketOpen, ] = $bracketClose, diff = $($bracketOpen - $bracketClose)"
    Write-Output "Backticks: $backtickCount (should be even: $($backtickCount % 2 -eq 0))"
    
    if ($parenStack.Count -gt 0) {
        Write-Output "`nERROR: $($parenStack.Count) unmatched '(' at script lines:"
        while ($parenStack.Count -gt 0) { Write-Output "  Line $($parenStack.Pop())" }
    }
    if ($braceStack.Count -gt 0) {
        Write-Output "`nERROR: $($braceStack.Count) unmatched '{' at script lines:"
        while ($braceStack.Count -gt 0) { Write-Output "  Line $($braceStack.Pop())" }
    }
    if ($bracketStack.Count -gt 0) {
        Write-Output "`nERROR: $($bracketStack.Count) unmatched '[' at script lines:"
        while ($bracketStack.Count -gt 0) { Write-Output "  Line $($bracketStack.Pop())" }
    }
    
    if ($parenOpen -eq $parenClose -and $braceOpen -eq $braceClose -and $bracketOpen -eq $bracketClose -and $backtickCount % 2 -eq 0) {
        Write-Output "`nAll delimiters are balanced!"
    }
    
    # Also count how many script blocks exist
    $scriptMatches = [regex]::Matches($content, "<script>")
    Write-Output "`nTotal <script> blocks found: $($scriptMatches.Count)"
    
    # Check for common JS errors - search for patterns like "})" without proper closing
    # Look for "function " declarations to list all functions
    $funcMatches = [regex]::Matches($scriptContent, "function\s+(\w+)\s*\(")
    Write-Output "`nFunctions found: $($funcMatches.Count)"
    foreach ($m in $funcMatches) {
        # Just list first 5 and last 5
    }
    
} else {
    Write-Output "Could not find script block"
}
