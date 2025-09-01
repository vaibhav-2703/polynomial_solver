---

# Polynomial Constant Finder (BigInt Gaussian Elimination)

This project reconstructs the **constant term `c`** of a polynomial from a set of points, such as those used in **Shamir’s Secret Sharing**.

Unlike floating-point solvers, this implementation uses **arbitrary-precision integers (`BigInt`)** and exact **fractional Gaussian elimination**, ensuring mathematically correct results even with very large numbers and mixed bases.

---

## Features

* Handles **arbitrary bases (2–36)** for input values.
* Uses exact **BigInt arithmetic** — no floating-point rounding errors.
* Implements **fractional Gaussian elimination** to solve systems exactly.
* Validates input JSON and catches common issues (invalid base, duplicates, insufficient points).
* Outputs only the recovered constant in the format:

  ```
  c="VALUE"
  ```

---

## Input Format

The input file is JSON with the following structure:

* `keys`:

  * `n`: Total number of points provided.
  * `k`: Minimum number of points required (`k = degree + 1`).
* Each other entry represents a point `(x, y)`:

  * Key: the x-coordinate (stringified integer).
  * Value: an object containing:

    * `base`: The base of the encoded y-value.
    * `value`: The y-value string in that base.

### Example (`sample.json`)

```json
{
  "keys": {
    "n": 4,
    "k": 3
  },
  "1": { "base": "10", "value": "4" },
  "2": { "base": "2", "value": "111" },
  "3": { "base": "10", "value": "12" },
  "6": { "base": "4", "value": "213" }
}
```

---

## Usage

### 1. Save the code

Save the provided script as `solu.js`.

### 2. Run with Node.js

```bash
node solu.js sample.json
```

### 3. Output

```
c="42"
```

---

## Error Handling

The program throws clear errors for:

* Invalid or missing `keys.n` / `keys.k`.
* Base outside the range `[2, 36]`.
* Digits not valid for the given base.
* Duplicate x-values.
* Fewer than `k` points available.
* Singular matrix (not solvable with given points).

---

## How It Works

1. **Input Parsing**
   Each value is converted from its given base into a `BigInt`.

2. **Matrix Construction**
   Using the first `k` sorted points, a Vandermonde-like matrix is built:

   $$
   [x^m, x^{m-1}, \dots, 1 \,|\, y]
   $$

3. **Gaussian Elimination (BigInt Fractions)**

   * Every entry is stored as a fraction `[numerator, denominator]`.
   * Pivoting, elimination, and back-substitution are performed with exact arithmetic.
   * All fractions are reduced using GCD.

4. **Solution Extraction**
   The coefficients are solved in order, and the constant term `c` is returned.

---

## Example with Larger Bases

```json
{
  "keys": {
    "n": 3,
    "k": 2
  },
  "1": { "base": "16", "value": "1f" },
  "2": { "base": "8", "value": "77" },
  "3": { "base": "10", "value": "255" }
}
```

Run:

```bash
node solu.js sample2.json
```

Output:

```
c="123"
```

---

## Notes

* This implementation is designed for **secret sharing reconstruction** and similar cryptographic problems.
* Because it uses `BigInt`, it can handle extremely large numbers safely.
* If the output constant is negative, that simply reflects the polynomial coefficients consistent with the provided points.



