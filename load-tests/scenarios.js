module.exports = {
  generateTopic: generateTopic,
  generateFingerprint: generateFingerprint,
  generateSignature: generateSignature,
  randomIP: randomIP,
};

function generateTopic() {
  const topics = [
    "AI in healthcare",
    "Climate change solutions",
    "Space exploration",
    "Quantum computing",
    "Machine learning",
    "Blockchain technology",
    "Internet of Things",
    "Cybersecurity trends",
    "Virtual reality",
    "Artificial intelligence ethics",
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

function generateFingerprint() {
  // Simulated device fingerprint hash
  return 'fp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateSignature() {
  // Simulated Razorpay signature (would need real signing in production)
  return 'sig_' + Math.random().toString(36).substring(2, 30);
}

function randomIP() {
  return [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ].join('.');
}
