import { config } from './config.js';

// Fallback logic to mock AI generation if no Gemini API Key is provided
function generateMockCode(taskInput, language) {
  const inputLower = taskInput.toLowerCase();
  
  if (language === 'python') {
    // 1. Log Threat Analytics
    if (inputLower.includes('log') || inputLower.includes('threat') || inputLower.includes('parse') || inputLower.includes('waf') || inputLower.includes('security')) {
      return `
# MOCK AI GENERATED CODE (Dynamic Log Threat Analyzer & WAF Simulator)
import re

LOG_DATA = """
192.168.1.45 - - [26/Jun/2026:07:44:11] "GET /index.html HTTP/1.1" 200 4531
10.0.0.12 - - [26/Jun/2026:07:44:12] "POST /api/login HTTP/1.1" 401 230
192.168.1.45 - - [26/Jun/2026:07:44:15] "GET /api/users?id=1%20OR%201%3D1 HTTP/1.1" 200 1204
10.0.0.12 - - [26/Jun/2026:07:44:18] "POST /api/login HTTP/1.1" 401 230
10.0.0.12 - - [26/Jun/2026:07:44:20] "POST /api/login HTTP/1.1" 401 230
192.168.1.99 - - [26/Jun/2026:07:44:22] "GET /../../etc/passwd HTTP/1.1" 403 0
10.0.0.12 - - [26/Jun/2026:07:44:25] "POST /api/login HTTP/1.1" 401 230
"""

def scan_logs():
    print("[INIT] Booting Log parsing scanning daemon...")
    rules = {
        "SQL_Injection": r"(union\\\\s+select|select\\\\s+.*\\\\s+from|or\\\\s+1\\\\s*=\\\\s*1)",
        "Path_Traversal": r"(\\\\.\\\\./\\\\.\\\\./|/etc/passwd)",
        "Brute_Force": r"POST\\\\s+/api/login.*\\\\s+401"
    }
    
    incidents = []
    brute_force_tracker = {}
    
    lines = LOG_DATA.strip().split('\\n')
    for idx, line in enumerate(lines):
        ip = line.split(' ')[0]
        detected = False
        for rule_name, pattern in rules.items():
            if rule_name != "Brute_Force" and re.search(pattern, line, re.IGNORECASE):
                incidents.append((ip, rule_name, line))
                detected = True
                
        if re.search(rules["Brute_Force"], line, re.IGNORECASE):
            brute_force_tracker[ip] = brute_force_tracker.get(ip, 0) + 1
            if brute_force_tracker[ip] >= 3:
                incidents.append((ip, "Brute_Force_Attempt (3+ Failures)", line))
                
    print("\\n================= INTRUSION THREAT AUDIT REPORT =================")
    print("| IP ADDRESS     | THREAT CATEGORY       | STATUS      |")
    print("-----------------------------------------------------------------")
    for ip, threat, _ in incidents:
        print(f"| {ip:<14} | {threat:<21} | [FLAGGED]   |")
    print("=================================================================\\n")
    print(f"[SUCCESS] Scanned {len(lines)} log lines. Identified {len(incidents)} security anomalies.")

scan_logs()
`;
    }

    // 2. Maze pathfinder DFS
    if (inputLower.includes('maze') || inputLower.includes('path') || inputLower.includes('dfs') || inputLower.includes('bfs') || inputLower.includes('graph')) {
      return `
# MOCK AI GENERATED CODE (Depth First Search ASCII Maze Pathfinding Solver)
MAZE = [
    ["#", "#", "#", "#", "#", "#", "#", "#"],
    ["#", "S", " ", " ", "#", " ", " ", "#"],
    ["#", "#", "#", " ", "#", " ", "#", "#"],
    ["#", " ", " ", " ", " ", " ", " ", "#"],
    ["#", " ", "#", "#", "#", "#", " ", "#"],
    ["#", " ", " ", " ", "#", "G", " ", "#"],
    ["#", "#", "#", "#", "#", "#", "#", "#"]
]

def find_path():
    print("[INIT] Parsing maze boundaries. Height: 7, Width: 8")
    start = (1, 1)
    goal = (5, 5)
    stack = [start]
    visited = {start}
    parent = {}
    
    found = False
    while stack:
        curr = stack.pop()
        if curr == goal:
            found = True
            break
            
        r, c = curr
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < 7 and 0 <= nc < 8:
                if MAZE[nr][nc] != "#" and (nr, nc) not in visited:
                    visited.add((nr, nc))
                    parent[(nr, nc)] = curr
                    stack.append((nr, nc))
                    print(f"[PATHFINDER] Visiting coordinate: ({nr}, {nc})")
                    
    if found:
        print("\\n[SUCCESS] Goal path identified. Reconstructing layout...")
        curr = goal
        while curr in parent:
            r, c = curr
            if MAZE[r][c] not in ["S", "G"]:
                MAZE[r][c] = "*"
            curr = parent[curr]
            
        for row in MAZE:
            print(" ".join(row))
        print("\\n[LEGEND] S: Start | G: Goal | *: Solution Path | #: Wall")
    else:
        print("[FAILED] No valid path could be resolved between S and G.")

find_path()
`;
    }

    // 3. CSV Sales Analytics
    if (inputLower.includes('csv') || inputLower.includes('data') || inputLower.includes('report') || inputLower.includes('aggregate') || inputLower.includes('sales')) {
      return `
# MOCK AI GENERATED CODE (CSV Data Parser & Revenue Analytics Engine)
CSV_DATA = """
Product,Category,Revenue,Units
Laptop,Electronics,1200,1
Coffee Maker,Home,85,2
Headphones,Electronics,150,3
Desk Chair,Office,240,1
Desk Lamp,Office,45,2
Tablet,Electronics,450,1
"""

def process_sales():
    print("[INIT] Loading sales CSV transaction records...")
    lines = CSV_DATA.strip().split('\\n')[1:]
    
    cat_sales = {}
    total_revenue = 0
    
    for line in lines:
        parts = line.split(',')
        prod, cat, rev, units = parts[0], parts[1], float(parts[2]), int(parts[3])
        cat_sales[cat] = cat_sales.get(cat, 0) + (rev * units)
        total_revenue += (rev * units)
        
    print("\\n=================== CATEGORY REVENUE GRAPH ===================")
    for cat, rev in cat_sales.items():
        percentage = (rev / total_revenue) * 100
        bars = "#" * int(percentage // 3)
        print(f"{cat:<12} | {bars:<25} | \${rev:>8.2f} ({percentage:.1f}%)")
    print("--------------------------------------------------------------")
    print(f"Total Combined Aggregated Revenue: \${total_revenue:.2f}")
    print("==============================================================\\n")
    print("[SUCCESS] Sales analytics reporting compiled successfully.")

process_sales()
`;
    }

    // Standard Math Sieve Fallback (Cleaned & Detailed)
    return `
# MOCK AI GENERATED CODE (Prime Numbers Sieve & Factorial Calculator)
def solve_task(limit):
    print(f"[COMPILING] Running mathematical calculation sequence up to limit: {limit}")
    
    # Sieve of Eratosthenes
    sieve = [True] * (limit + 1)
    primes = []
    for p in range(2, limit + 1):
        if sieve[p]:
            primes.append(p)
            for i in range(p*p, limit + 1, p):
                sieve[i] = False
                
    print("[COMPILING] Prime detection complete. Factoring product bounds...")
    product = 1
    for prime in primes[:5]:
        product *= prime
        
    print(f"\\nPrimes identified: {primes}")
    print(f"Product of the first 5 primes: {product}")
    print("[SUCCESS] Tasks solved within isolated runtime environment boundaries.")

solve_task(50)
`;
  } else {
    // JavaScript Code Templates
    
    // 1. Log Threat Analytics (JS)
    if (inputLower.includes('log') || inputLower.includes('threat') || inputLower.includes('parse') || inputLower.includes('waf') || inputLower.includes('security')) {
      return `
// MOCK AI GENERATED CODE (Dynamic Log Threat Analyzer & WAF Simulator)
const LOG_DATA = \`
192.168.1.45 - - [26/Jun/2026:07:44:11] "GET /index.html HTTP/1.1" 200 4531
10.0.0.12 - - [26/Jun/2026:07:44:12] "POST /api/login HTTP/1.1" 401 230
192.168.1.45 - - [26/Jun/2026:07:44:15] "GET /api/users?id=1%20OR%201%3D1 HTTP/1.1" 200 1204
10.0.0.12 - - [26/Jun/2026:07:44:18] "POST /api/login HTTP/1.1" 401 230
10.0.0.12 - - [26/Jun/2026:07:44:20] "POST /api/login HTTP/1.1" 401 230
192.168.1.99 - - [26/Jun/2026:07:44:22] "GET /../../etc/passwd HTTP/1.1" 403 0
10.0.0.12 - - [26/Jun/2026:07:44:25] "POST /api/login HTTP/1.1" 401 230
\`;

function scanLogs() {
  console.log("[INIT] Booting Log parsing scanning daemon...");
  const rules = {
    SQL_Injection: /(union\\s+select|select\\s+.*\\s+from|or\\s+1\\s*=\\s*1)/i,
    Path_Traversal: /(\\.\\.\\/\\.\\.\\/|\\/etc\\/passwd)/i,
    Brute_Force: /POST\\s+\\/api\\/login.*\\s+401/i
  };
  
  const incidents = [];
  const bruteForceTracker = {};
  
  const lines = LOG_DATA.trim().split('\\n');
  lines.forEach((line) => {
    const ip = line.split(' ')[0];
    
    // Pattern matches
    if (rules.SQL_Injection.test(line)) {
      incidents.push({ ip, threat: 'SQL_Injection' });
    }
    if (rules.Path_Traversal.test(line)) {
      incidents.push({ ip, threat: 'Path_Traversal' });
    }
    if (rules.Brute_Force.test(line)) {
      bruteForceTracker[ip] = (bruteForceTracker[ip] || 0) + 1;
      if (bruteForceTracker[ip] >= 3) {
        incidents.push({ ip, threat: 'Brute_Force (3+ Failures)' });
      }
    }
  });
  
  console.log("\\n================= INTRUSION THREAT AUDIT REPORT =================");
  console.log("| IP ADDRESS     | THREAT CATEGORY       | STATUS      |");
  console.log("-----------------------------------------------------------------");
  incidents.forEach((inc) => {
    console.log(\`| \${inc.ip.padEnd(14)} | \${inc.threat.padEnd(21)} | [FLAGGED]   |\`);
  });
  console.log("=================================================================\\n");
  console.log(\`[SUCCESS] Scanned \${lines.length} log lines. Identified \${incidents.length} security alerts.\`);
}

scanLogs();
`;
    }

    // 2. Maze pathfinder DFS (JS)
    if (inputLower.includes('maze') || inputLower.includes('path') || inputLower.includes('dfs') || inputLower.includes('bfs') || inputLower.includes('graph')) {
      return `
// MOCK AI GENERATED CODE (Depth First Search ASCII Maze Pathfinding Solver)
const MAZE = [
  ["#", "#", "#", "#", "#", "#", "#", "#"],
  ["#", "S", " ", " ", "#", " ", " ", "#"],
  ["#", "#", "#", " ", "#", " ", "#", "#"],
  ["#", " ", " ", " ", " ", " ", " ", "#"],
  ["#", " ", "#", "#", "#", "#", " ", "#"],
  ["#", " ", " ", " ", "#", "G", " ", "#"],
  ["#", "#", "#", "#", "#", "#", "#", "#"]
];

function findPath() {
  console.log("[INIT] Parsing maze boundaries. Height: 7, Width: 8");
  const start = [1, 1];
  const goal = [5, 5];
  const stack = [start];
  const visited = new Set([\`\${start[0]},\${start[1]}\`]);
  const parent = {};
  
  let found = false;
  while (stack.length > 0) {
    const curr = stack.pop();
    if (curr[0] === goal[0] && curr[1] === goal[1]) {
      found = true;
      break;
    }
    
    const [r, c] = curr;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 8) {
        if (MAZE[nr][nc] !== "#" && !visited.has(\`\${nr},\${nc}\`)) {
          visited.add(\`\${nr},\${nc}\`);
          parent[\`\${nr},\${nc}\`] = curr;
          stack.push([nr, nc]);
          console.log(\`[PATHFINDER] Visiting coordinate: (\${nr}, \${nc})\`);
        }
      }
    }
  }
  
  if (found) {
    console.log("\\n[SUCCESS] Goal path identified. Reconstructing layout...");
    let curr = goal;
    while (curr) {
      const [r, c] = curr;
      if (MAZE[r][c] !== "S" && MAZE[r][c] !== "G") {
        MAZE[r][c] = "*";
      }
      curr = parent[\`\${r},\${c}\`] || null;
    }
    
    MAZE.forEach(row => console.log(row.join(" ")));
    console.log("\\n[LEGEND] S: Start | G: Goal | *: Solution Path | #: Wall");
  } else {
    console.log("[FAILED] No valid path could be resolved between S and G.");
  }
}

findPath();
`;
    }

    // Default Math Fallback (JS)
    return `
// MOCK AI GENERATED CODE (Prime Numbers Sieve & Factorial Calculator)
function solveTask(limit) {
  console.log(\`[COMPILING] Running mathematical calculation sequence up to limit: \${limit}\`);
  
  const sieve = Array(limit + 1).fill(true);
  const primes = [];
  for (let p = 2; p <= limit; p++) {
    if (sieve[p]) {
      primes.push(p);
      for (let i = p * p; i <= limit; i += p) {
        sieve[i] = false;
      }
    }
  }
  
  console.log("[COMPILING] Prime detection complete. Factoring product bounds...");
  let product = 1;
  primes.slice(0, 5).forEach(prime => {
    product *= prime;
  });
  
  console.log("\\nPrimes identified: " + primes.join(", "));
  console.log("Product of the first 5 primes: " + product);
  console.log("[SUCCESS] Tasks solved within isolated runtime environment boundaries.");
}

solveTask(50);
`;
  }
}

// Queries the Gemini API to write code for the task, or uses the mock generator as fallback
export async function generateCodeWithAI(systemInstruction, taskInput, language) {
  const prompt = `
  You are an SDE code generator agent.
  Your system instruction: "${systemInstruction}"
  The user task: "${taskInput}"
  
  Write a clean, functional code script in ${language} that executes the requested task.
  Include log statements (print or console.log) to demonstrate execution stages.
  IMPORTANT: Return ONLY the raw script code. DO NOT wrap it in markdown code blocks like \`\`\`${language} ... \`\`\`. Do not include comments describing your AI status, just the code itself.
  `;

  if (!config.geminiApiKey || config.geminiApiKey === 'YOUR_GEMINI_API_KEY') {
    console.log('[GEMINI] API key not set or placeholder. Falling back to local mock code generator.');
    return generateMockCode(taskInput, language);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`;

  try {
    console.log(`[GEMINI] Dispatching code generation prompt to Gemini API...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: Status ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Gemini API returned an empty or invalid response format.');
    }

    // Post-process response to remove potential markdown wrapping formatting
    text = text.trim();
    if (text.startsWith('```')) {
      // Remove starting marker
      const lines = text.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      // Remove ending marker
      if (lines[lines.length - 1] === '```') {
        lines.pop();
      }
      text = lines.join('\n');
    }

    return text.trim();
  } catch (err) {
    console.error('[GEMINI ERROR] Code generation API query failed. Using mock generator fallback. Details:', err.message);
    return generateMockCode(taskInput, language);
  }
}
