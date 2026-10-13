# Business analysis workflow example

The page at `src/pages/business-analysis/+page.md` uses fictional delivery-operation data.

The denominator for delivery time and cost per order is **completed orders**. Costs are fictional USD amounts, displayed to two decimal places with Evidence's `usd2` format. The original sample fields `avg_delivery_minutes` and `cost_per_order` remain available. `total_delivery_minutes` and `total_cost` are constructed as those fictional daily averages multiplied by completed orders, for teaching how totals and denominators should be rolled up. They do not recover raw timing or cost records from a real system. A production analysis should use its actual matched totals and order counts.

Summary and weather queries sum the totals and divide by the sum of completed orders. Fulfillment rate uses completed orders divided by requested orders. A zero denominator produces SQL `NULL`, because an average or rate is undefined in that case. Weather slices do not control for city mix and do not establish causality.

Install DuckDB for Python and run the focused regressions from the repository root:

```shell
python -m pip install duckdb
python -m unittest discover -s sites/example-project/tests -v
```

The tests execute the page's SQL in DuckDB and cover the supplied sample, unequal order volumes, the weather slice, and zero denominators.
