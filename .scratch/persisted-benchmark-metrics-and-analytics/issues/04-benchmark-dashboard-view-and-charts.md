# 04: Benchmark Analytics Dashboard View & Visual Charts

**What to build:**
- Create `src/views/Benchmark.tsx`:
  - Fetch benchmark data with `useBenchmarkMetrics()` (`@tanstack/react-query`).
  - 4 interactive, responsive SVG visual charts:
    1. **Elo vs. Accuracy Comparison / Scatter**
    2. **Move Classification Breakdown** (stacked horizontal bar chart)
    3. **Think Time vs. Blunder Rate**
    4. **Token Efficiency by Model & Provider**
  - Searchable, sortable benchmark matrix table with provider filtering.
- Create `src/app/benchmark/page.tsx` rendering `<Benchmark />`.
- Update navigation in `src/app/layout.tsx` to include `/benchmark` link.
- Add component tests in `src/views/Benchmark.test.tsx`.

**Blocked by:** 02.

**Status:** done

- [x] `Benchmark.tsx` view with 4 charts and matrix table implemented.
- [x] `/benchmark` page route registered and navigation updated.
- [x] Tests pass in `Benchmark.test.tsx`.
