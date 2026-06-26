import { config } from './config.js';

// Fallback logic to mock AI generation if no Gemini API Key is provided
function generateMockCode(taskInput, language) {
  const inputLower = taskInput.toLowerCase();
  
  if (language === 'python') {
    if (inputLower.includes('fibonacci') || inputLower.includes('fib')) {
      return `
# MOCK GEMINI GENERATED CODE (Fibonacci Sequence Solver)
def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

limit = 10
print(f"Calculating first {limit} Fibonacci numbers:")
result = fibonacci(limit)
print("Fibonacci series result:", result)
`;
    }
    
    if (inputLower.includes('prime') || inputLower.includes('primes')) {
      return `
# MOCK GEMINI GENERATED CODE (Prime Sieve Solver)
def get_primes(limit):
    primes = []
    for num in range(2, limit + 1):
        for i in range(2, int(num ** 0.5) + 1):
            if num % i == 0:
                break
        else:
            primes.append(num)
    return primes

limit = 50
print(f"Finding all primes up to {limit}:")
print("Primes list:", get_primes(limit))
`;
    }

    if (inputLower.includes('sort') || inputLower.includes('bubble')) {
      return `
# MOCK GEMINI GENERATED CODE (Sorting Algorithm Simulator)
import random

array = [random.randint(1, 100) for _ in range(10)]
print("Unsorted array:", array)

# Bubble sort
for i in range(len(array)):
    for j in range(0, len(array) - i - 1):
        if array[j] > array[j+1]:
            array[j], array[j+1] = array[j+1], array[j]

print("Bubble Sorted array:", array)
`;
    }

    // Default general script
    return `
# MOCK GEMINI GENERATED CODE (Default Python Task Runner)
print("Parsing Agent Prompt: '${taskInput.replace(/'/g, "\\'")}'")
total_sum = sum(range(1, 101))
print("Executed system execution check. Sum of 1 to 100 is:", total_sum)
print("Task accomplished successfully.")
`;
  } else {
    // JavaScript
    if (inputLower.includes('fibonacci') || inputLower.includes('fib')) {
      return `
// MOCK GEMINI GENERATED CODE (Fibonacci Sequence Solver)
function fibonacci(n) {
  const sequence = [0, 1];
  while (sequence.length < n) {
    sequence.push(sequence[sequence.length - 1] + sequence[sequence.length - 2]);
  }
  return sequence.slice(0, n);
}

const limit = 10;
console.log(\`Calculating first \${limit} Fibonacci numbers:\`);
console.log("Fibonacci series result:", fibonacci(limit));
`;
    }

    if (inputLower.includes('sort') || inputLower.includes('bubble')) {
      return `
// MOCK GEMINI GENERATED CODE (Sorting Algorithm Simulator)
const array = Array.from({ length: 10 }, () => Math.floor(Math.random() * 100));
console.log("Unsorted array:", array.join(", "));

for (let i = 0; i < array.length; i++) {
  for (let j = 0; j < array.length - i - 1; j++) {
    if (array[j] > array[j + 1]) {
      const temp = array[j];
      array[j] = array[j + 1];
      array[j + 1] = temp;
    }
  }
}
console.log("Sorted array:", array.join(", "));
`;
    }

    // Default general script
    return `
// MOCK GEMINI GENERATED CODE (Default JS Task Runner)
console.log("Parsing Agent Prompt: '${taskInput.replace(/'/g, "\\'")}'");
let count = 0;
for (let i = 1; i <= 10; i++) {
  count += i;
}
console.log("Running task validation checks. Sum 1 to 10 is: " + count);
console.log("Task finished execution.");
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
