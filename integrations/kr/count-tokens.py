#!/usr/bin/env python3
"""Optional local tokenizer measurement: pip install tiktoken; no model/API call."""
import json
import pathlib
import sys
import tiktoken
root = pathlib.Path(sys.argv[1])
result = {}
for name in ('o200k_base', 'cl100k_base'):
    encoding = tiktoken.get_encoding(name)
    counts = {}
    for kind in ('raw', 'first', 'repeat', 'changed'):
        content = (root / f'{kind}.json').read_text()
        value = json.loads(content)
        counts[kind] = {'bytes': len(content.encode()), 'tokens': len(encoding.encode(content)), 'jobs': len(value) if isinstance(value, list) else len(value['jobs'])}
    for kind in ('first', 'repeat', 'changed'):
        counts[kind]['reduction_vs_full_fixture_pct'] = round((1 - counts[kind]['tokens'] / counts['raw']['tokens']) * 100, 2)
    result[name] = counts
(root / 'token-counts.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
