import anthropic

client = anthropic.Anthropic(
    # defaults to os.environ.get("ANTHROPIC_API_KEY")
    api_key="my_api_key",
)

message = client.beta.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=20000,
    temperature=1,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "PROMPT"
                }
            ]
        }
    ],
    tools=[
        {
            "name": "web_search",
            "type": "web_search_20250305",
            "max_uses": 1
        }
    ],
    thinking={
        "type": "enabled",
        "budget_tokens": 5000
    },
    betas=["web-search-2025-03-05"]
)
print(message.content)
