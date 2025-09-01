const fs = require('fs');

function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    let t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function strToBigInt(str, base) {
  if (base < 2 || base > 36) throw new Error(`Invalid base: ${base}`);
  let res = 0n;
  for (let char of str.toLowerCase()) {
    let digit;
    if (char >= '0' && char <= '9') {
      digit = char.charCodeAt(0) - '0'.charCodeAt(0);
    } else if (char >= 'a' && char <= 'z') {
      digit = char.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    } else {
      throw new Error(`Invalid character '${char}' in value`);
    }
    if (digit >= base) throw new Error(`Digit ${char} invalid for base ${base}`);
    res = res * BigInt(base) + BigInt(digit);
  }
  return res;
}

function gaussianElimination(matrix) {
  const n = matrix.length;
  const m = matrix.map(row => [...row]);
  
  // Convert to fractions [numerator, denominator]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n; j++) {
      m[i][j] = [BigInt(m[i][j]), 1n];
    }
  }
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find non-zero pivot
    let pivotRow = -1;
    for (let k = i; k < n; k++) {
      if (m[k][i][0] !== 0n) {
        pivotRow = k;
        break;
      }
    }
    
    if (pivotRow === -1) throw new Error('Matrix is singular');
    
    // Swap rows if needed
    if (pivotRow !== i) {
      [m[i], m[pivotRow]] = [m[pivotRow], m[i]];
    }
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      if (m[k][i][0] !== 0n) {
        // Calculate multiplier: m[k][i] / m[i][i]
        const multNum = m[k][i][0] * m[i][i][1];
        const multDen = m[k][i][1] * m[i][i][0];
        
        // Eliminate: row[k] = row[k] - multiplier * row[i]
        for (let j = i; j <= n; j++) {
          // m[k][j] = m[k][j] - (multNum/multDen) * m[i][j]
          const newNum = m[k][j][0] * m[k][j][1] * multDen - multNum * m[i][j][0] * m[i][j][1];
          const newDen = m[k][j][1] * multDen;
          
          // Reduce fraction
          if (newNum === 0n) {
            m[k][j] = [0n, 1n];
          } else {
            const g = gcd(newNum < 0n ? -newNum : newNum, newDen);
            m[k][j] = [newNum / g, newDen / g];
          }
        }
      }
    }
  }
  
  // Back substitution
  const solution = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    if (m[i][i][0] === 0n) throw new Error('Matrix is singular');
    
    // Start with the constant term
    let [sumNum, sumDen] = [m[i][n][0], m[i][n][1]];
    
    // Subtract known terms
    for (let j = i + 1; j < n; j++) {
      if (m[i][j][0] !== 0n) {
        // Subtract m[i][j] * solution[j] from sum
        const termNum = m[i][j][0] * m[i][j][1] * solution[j][0] * solution[j][1];
        const termDen = m[i][j][1] * solution[j][1];
        
        const newSumNum = sumNum * termDen - termNum * sumDen;
        const newSumDen = sumDen * termDen;
        
        if (newSumNum === 0n) {
          [sumNum, sumDen] = [0n, 1n];
        } else {
          const g = gcd(newSumNum < 0n ? -newSumNum : newSumNum, newSumDen);
          [sumNum, sumDen] = [newSumNum / g, newSumDen / g];
        }
      }
    }
    
    // Divide by diagonal coefficient: sum / m[i][i]
    const resNum = sumNum * m[i][i][1];
    const resDen = sumDen * m[i][i][0];
    
    if (resNum === 0n) {
      solution[i] = [0n, 1n];
    } else {
      const g = gcd(resNum < 0n ? -resNum : resNum, resDen);
      solution[i] = [resNum / g, resDen / g];
    }
  }
  
  // Convert fractions to integers (they should be integers for secret sharing)
  return solution.map(([num, den]) => {
    if (den === 1n) {
      return num;
    } else {
      // For secret sharing, coefficients should be integers
      // If we get a fraction, it might indicate numerical issues
      // But we'll return the division anyway
      return num / den;
    }
  });
}

function findConstantC(jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  if (!data.keys || typeof data.keys.n !== 'number' || typeof data.keys.k !== 'number') {
    throw new Error('Invalid JSON: missing or invalid keys');
  }
  
  const n = data.keys.n;
  const k = data.keys.k;
  if (k < 1) throw new Error('k must be at least 1');
  
  const points = [];
  for (let key in data) {
    if (key === 'keys') continue;
    const x = BigInt(key);
    const entry = data[key];
    if (!entry.base || !entry.value) throw new Error(`Missing base or value for x=${key}`);
    const base = parseInt(entry.base, 10);
    if (isNaN(base)) throw new Error(`Invalid base for x=${key}`);
    const y = strToBigInt(entry.value, base);
    points.push({ x, y });
  }
  
  if (points.length < k) throw new Error(`Need ${k} points, got ${points.length}`);
  
  points.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
  const selectedPoints = points.slice(0, k);
  
  for (let i = 1; i < selectedPoints.length; i++) {
    if (selectedPoints[i].x === selectedPoints[i-1].x) {
      throw new Error('Duplicate x-values detected');
    }
  }
  
  const matrix = [];
  for (let { x, y } of selectedPoints) {
    const row = [];
    for (let j = k - 1; j >= 0; j--) {
      row.push(x ** BigInt(j));
    }
    row.push(y);
    matrix.push(row);
  }
  
  const coefficients = gaussianElimination(matrix);
  return coefficients[coefficients.length - 1];
}

if (require.main === module) {
  if (process.argv.length < 3) {
    console.error('Usage: node script.js <json_filename>');
    process.exit(1);
  }
  try {
    const c = findConstantC(process.argv[2]);
    console.log(`c="${c}"`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}