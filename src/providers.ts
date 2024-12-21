export default {
    OpenAI: {
        id: "openai",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4"],
        additional: {}
    },
    Anthropic: {
        id: "anthropic",
        models: ["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620", "claude-3-5-haiku-20241022"],
        additional: {}
    },
    "Google Generative AI": {
        id: "google",
        models: ["gemini-1.5-flash", "gemini-1.5-pro"],
        additional: {}
    },
    "Google Vertex": {
        id: "google-vertex",
        models: ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"],
        additional: {}
    },
    Groq: {
        id: "groq",
        models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
        additional: {}
    },
    Perplexity: {
        id: "openai",
        models: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"],
        additional: {
            name: 'perplexity',
            baseURL: 'https://api.perplexity.ai/',
        }
    }

}