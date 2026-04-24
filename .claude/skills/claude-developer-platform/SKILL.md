---
name: claude-developer-platform
description: Build applications with the Anthropic Claude API and SDKs. Covers Messages API, streaming, tool use, vision, extended thinking, batches, prompt caching, cost optimization, and agentic loops in Python and TypeScript.
---

# Claude Developer Platform Skill

Build production-ready applications with the Anthropic Claude API and SDKs. Covers Python and TypeScript patterns for all major API features.

---

## 1. Model Selection

| Model | ID | Best For |
|-------|-----|----------|
| Opus 4.1 | `claude-opus-4-1` | Complex reasoning, architecture, research |
| Sonnet 4.6 | `claude-sonnet-4-6` | Balanced coding, most development tasks |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast responses, high-volume, cost-sensitive |

Default to Sonnet 4.6 unless the task requires deep reasoning (Opus) or speed/cost optimization (Haiku). In production, always use pinned snapshot IDs over floating aliases — aliases change behavior without notice.

---

## 2. Python SDK

**Installation:**
```bash
pip install anthropic
```

**Basic message:**
```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain async/await in Python"}]
)
print(message.content[0].text)
```

**Streaming:**
```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a haiku about coding"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

**System prompt:**
```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="You are a senior Python developer. Be concise.",
    messages=[{"role": "user", "content": "Review this function"}]
)
```

---

## 3. TypeScript SDK

**Installation:**
```bash
npm install @anthropic-ai/sdk
```

**Basic message:**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Explain async/await in TypeScript" }],
});
console.log(message.content[0].text);
```

**Streaming:**
```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a haiku" }],
});

for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}
```

---

## 4. Tool Use

Define tools and let Claude call them:

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
]

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in SF?"}]
)

# Handle tool use response
for block in message.content:
    if block.type == "tool_use":
        result = get_weather(**block.input)
        follow_up = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=tools,
            messages=[
                {"role": "user", "content": "What's the weather in SF?"},
                {"role": "assistant", "content": message.content},
                {"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": block.id, "content": str(result)}
                ]}
            ]
        )
```

---

## 5. Vision

Send images for analysis:

```python
import base64

with open("diagram.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
            {"type": "text", "text": "Describe this diagram"}
        ]
    }]
)
```

---

## 6. Extended Thinking

For complex reasoning tasks:

```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000
    },
    messages=[{"role": "user", "content": "Solve this math problem step by step..."}]
)

for block in message.content:
    if block.type == "thinking":
        print(f"Thinking: {block.thinking}")
    elif block.type == "text":
        print(f"Answer: {block.text}")
```

---

## 7. Prompt Caching

Cache large system prompts or context to reduce costs:

```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {"type": "text", "text": large_system_prompt, "cache_control": {"type": "ephemeral"}}
    ],
    messages=[{"role": "user", "content": "Question about the cached context"}]
)
# Check cache usage
print(f"Cache read: {message.usage.cache_read_input_tokens}")
print(f"Cache creation: {message.usage.cache_creation_input_tokens}")
```

Use prompt caching for system prompts over 1024 tokens — saves both cost and latency.

---

## 8. Batches API

Process large volumes asynchronously at 50% cost reduction:

```python
import time

batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"request-{i}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}]
            }
        }
        for i, prompt in enumerate(prompts)
    ]
)

# Poll for completion
while True:
    status = client.messages.batches.retrieve(batch.id)
    if status.processing_status == "ended":
        break
    time.sleep(30)

# Get results
for result in client.messages.batches.results(batch.id):
    print(result.result.message.content[0].text)
```

---

## 9. Agentic Loop Pattern

Build multi-step agents with tool use:

```python
client = anthropic.Anthropic()
messages = [{"role": "user", "content": "Review the auth module for security issues"}]

while True:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        tools=tools,
        messages=messages,
    )
    if response.stop_reason == "end_turn":
        break
    # Append assistant response and handle tool calls
    messages.append({"role": "assistant", "content": response.content})
    for block in response.content:
        if block.type == "tool_use":
            tool_result = execute_tool(block.name, block.input)
            messages.append({
                "role": "user",
                "content": [{"type": "tool_result", "tool_use_id": block.id, "content": str(tool_result)}]
            })
```

---

## 10. Cost Optimization

| Strategy | Savings | When to Use |
|----------|---------|-------------|
| Prompt caching | Up to 90% on cached tokens | Repeated system prompts or context |
| Batches API | 50% | Non-time-sensitive bulk processing |
| Haiku instead of Sonnet | ~75% | Simple tasks, classification, extraction |
| Shorter `max_tokens` | Variable | When you know output will be short |

**Model routing by complexity:**
```python
def select_model(text_length: int, item_count: int) -> str:
    if text_length >= 10_000 or item_count >= 30:
        return "claude-sonnet-4-6"  # Complex task
    return "claude-haiku-4-5-20251001"  # Simple task (3-4x cheaper)
```

**Pricing reference (2025-2026):**

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|---------------------|----------------------|
| Haiku 4.5 | $0.80 | $4.00 |
| Sonnet 4.6 | $3.00 | $15.00 |
| Opus 4.5 | $15.00 | $75.00 |

---

## 11. Error Handling

Retry only on transient errors. Fail fast on authentication or bad request errors.

```python
import time
from anthropic import APIError, RateLimitError, APIConnectionError, InternalServerError

_RETRYABLE = (APIConnectionError, RateLimitError, InternalServerError)

def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except _RETRYABLE:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
    # AuthenticationError, BadRequestError → raise immediately
```

```python
try:
    message = client.messages.create(...)
except RateLimitError:
    time.sleep(60)
except APIConnectionError:
    pass  # Retry with backoff
except APIError as e:
    print(f"API error {e.status_code}: {e.message}")
```

---

## 12. Environment Setup

```bash
# Required
export ANTHROPIC_API_KEY="your-api-key-here"

# Optional: set default model
export ANTHROPIC_MODEL="claude-sonnet-4-6"
```

**Never hardcode API keys.** Always use environment variables or a secrets manager. Store keys in `.env` files locally (gitignored) and use platform-native secret injection in CI/CD.
