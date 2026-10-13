---
title: Date input regression fixture
---

<script>
    import { page as regressionPage } from '$app/stores';
    const params = $regressionPage.url.searchParams;
    let start = params.get('start') ?? '2024-01-01';
    let end = params.get('end') ?? '2025-01-31';
    const defaultValue = params.get('default') ?? '2024-12-29';
    const range = params.get('range') === 'true';
    let mounted = true;
</script>

<p id="bounds">Allowed: {start} – {end}</p>

{#if mounted}
<DateInput name="review_date" {start} {end} {defaultValue} {range} />
{/if}

<pre id="stored">{JSON.stringify(inputs)}</pre>

<button on:click={() => { start = '2025-01-01'; end = '2025-01-31'; }}>Narrow allowed range</button>
<button on:click={() => mounted = false}>Unmount</button>
<button on:click={() => mounted = true}>Remount</button>
<button on:click={() => { start = '2025-01-01'; end = '2026-02-15'; }}>Shift bounds to next year</button>
