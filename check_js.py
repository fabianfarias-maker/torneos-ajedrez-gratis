import re

def check_file():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all script blocks
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    
    for i, script in enumerate(scripts):
        backticks = script.count('`')
        print(f"Script {i+1}: {backticks} backticks")
        if backticks % 2 != 0:
            print(f"WARNING: Script {i+1} has an odd number of backticks ({backticks})!")
            
check_file()
