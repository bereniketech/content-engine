#!/bin/bash

echo "=== Load Test Verification ==="
echo ""

# Check if load-tests directory exists
if [ ! -d "load-tests" ]; then
    echo "✗ load-tests directory not found"
    exit 1
fi
echo "✓ load-tests directory exists"

# Check if load-test.yml exists
if [ ! -f "load-tests/load-test.yml" ]; then
    echo "✗ load-tests/load-test.yml not found"
    exit 1
fi
echo "✓ load-tests/load-test.yml exists"

# Check if scenarios.js exists
if [ ! -f "load-tests/scenarios.js" ]; then
    echo "✗ load-tests/scenarios.js not found"
    exit 1
fi
echo "✓ load-tests/scenarios.js exists"

# Check if README.md exists
if [ ! -f "load-tests/README.md" ]; then
    echo "✗ load-tests/README.md not found"
    exit 1
fi
echo "✓ load-tests/README.md exists"

# Verify YAML syntax using grep for basic checks
if ! grep -q "config:" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing config section"
    exit 1
fi
echo "✓ load-test.yml has config section"

if ! grep -q "scenarios:" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing scenarios section"
    exit 1
fi
echo "✓ load-test.yml has scenarios section"

# Check for required scenarios
if ! grep -q "Content generation flow" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing 'Content generation flow' scenario"
    exit 1
fi
echo "✓ load-test.yml has 'Content generation flow' scenario"

if ! grep -q "Signup flow" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing 'Signup flow' scenario"
    exit 1
fi
echo "✓ load-test.yml has 'Signup flow' scenario"

if ! grep -q "Razorpay webhook" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing 'Razorpay webhook' scenario"
    exit 1
fi
echo "✓ load-test.yml has 'Razorpay webhook' scenario"

# Verify scenarios.js exports functions
if ! grep -q "module.exports" load-tests/scenarios.js; then
    echo "✗ scenarios.js missing module.exports"
    exit 1
fi
echo "✓ scenarios.js has module.exports"

if ! grep -q "function generateTopic" load-tests/scenarios.js; then
    echo "✗ scenarios.js missing generateTopic function"
    exit 1
fi
echo "✓ scenarios.js has generateTopic function"

if ! grep -q "function generateFingerprint" load-tests/scenarios.js; then
    echo "✗ scenarios.js missing generateFingerprint function"
    exit 1
fi
echo "✓ scenarios.js has generateFingerprint function"

if ! grep -q "function generateSignature" load-tests/scenarios.js; then
    echo "✗ scenarios.js missing generateSignature function"
    exit 1
fi
echo "✓ scenarios.js has generateSignature function"

if ! grep -q "function randomIP" load-tests/scenarios.js; then
    echo "✗ scenarios.js missing randomIP function"
    exit 1
fi
echo "✓ scenarios.js has randomIP function"

# Check README.md content
if ! grep -q "# Load Testing" load-tests/README.md; then
    echo "✗ README.md missing title"
    exit 1
fi
echo "✓ README.md has proper title"

if ! grep -q "artillery run" load-tests/README.md; then
    echo "✗ README.md missing usage instructions"
    exit 1
fi
echo "✓ README.md has usage instructions"

# Verify configuration targets are defined
if ! grep -q "target:" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing target configuration"
    exit 1
fi
echo "✓ load-test.yml has target configuration"

# Verify phases are defined
if ! grep -q "phases:" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing phases configuration"
    exit 1
fi
echo "✓ load-test.yml has phases configuration"

# Check for processor definition
if ! grep -q "processor:" load-tests/load-test.yml; then
    echo "✗ load-test.yml missing processor configuration"
    exit 1
fi
echo "✓ load-test.yml has processor configuration"

echo ""
echo "=== All Verification Checks Passed ==="
echo ""
echo "Load Testing Environment is ready!"
echo ""
echo "To run load tests:"
echo "  artillery run load-tests/load-test.yml --target http://localhost:3000"
echo ""
echo "For more information, see load-tests/README.md"
exit 0
