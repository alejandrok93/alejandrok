# Slide 6 · cost data and sources

Checked 2026-10-28.

## The pair on the chart

| | Oct 2025 | Oct 2026 |
|---|---|---|
| Model | Claude Sonnet 4.5 (released 2025-09-29) | Claude Haiku 5.5 (released 2026-10-07) |
| Input, USD / 1M tokens | $3.00 | $0.10 (prompts ≤100K tokens) |
| Output, USD / 1M tokens | $15.00 | $0.50 (prompts ≤100K tokens) |
| Ratio | — | 30× cheaper on input and on output |

The chart bars show the output price: $15 vs $0.50. The labels show the input price.

Caveat: Haiku 5.5 has a long-prompt tier. Above 100K prompt tokens it costs $0.50 in / $2.50 out, so the ratio drops to 6× for those requests. The footnote on the slide says «prompts ≤100K tokens».

## Why the pair is "the same level of intelligence"

Artificial Analysis runs both models on the same evaluations. Haiku 5.5 (Max) scores higher than Claude 4.5 Sonnet (Reasoning) on every shared one it lists:

| Evaluation (Artificial Analysis) | Haiku 5.5 (Max) | Sonnet 4.5 (Reasoning) |
|---|---|---|
| AA-Briefcase v1.1 (Elo) | 1575 | 714 |
| AutomationBench-AA | 35% | 14% |
| Terminal-Bench 4.0 | 33% | 0% |
| GDP.pdf | 21% | 5% |

The Intelligence Index v5.0 shows N/A for Sonnet 4.5 (deprecated), so the slide does not quote an index score.

## Sources

- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing (rows «Claude Sonnet 4.5» and «Claude Haiku 5.5»)
- Anthropic, «Introducing Claude Haiku 5.5» (2026-10-07): https://www.anthropic.com/news/claude-haiku-5-5
- Artificial Analysis comparison: https://artificialanalysis.ai/models/comparisons/claude-4-5-sonnet-thinking-vs-claude-haiku-5-5
- Artificial Analysis model pages: https://artificialanalysis.ai/models/claude-haiku-5-5 · https://artificialanalysis.ai/models/claude-4-5-sonnet-thinking

## Context for the speaker (not on the slide)

- a16z, «LLMflation» (https://a16z.com/llmflation-llm-inference-cost/): at constant capability, cost falls ≈10× per year. GPT-3 cost $60 per 1M tokens in Nov 2021. The cheapest model with the same MMLU score, Llama 3.2 3B on Together.ai, cost $0.06 three years later.
- The Sonnet 4.5 → Haiku 5.5 pair is 30× in one year, faster than the a16z trend.
- Epoch AI (https://epoch.ai/blog/llm-inference-price-trends) measures 9× to 900× per year depending on the benchmark threshold.
