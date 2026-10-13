"""Run with python -m unittest discover -s sites/example-project/tests after pip install duckdb."""
import pathlib
import re
import unittest

import duckdb

PAGE = pathlib.Path(__file__).resolve().parents[1] / 'src/pages/business-analysis/+page.md'
QUERIES = dict(re.findall(r'(?:~~~|```)sql\s+(\w+)\s*\n(.*?)\n(?:~~~|```)', PAGE.read_text(encoding='utf-8'), re.S))


class BusinessAnalysisWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.db = duckdb.connect()

    def tearDown(self):
        self.db.close()

    def result(self, name):
        sql = re.sub(r'\$\{(\w+)\}', r'\1', QUERIES[name])
        output = self.db.execute(sql)
        return [dict(zip([column[0] for column in output.description], row)) for row in output.fetchall()]

    def fixture(self, rows):
        self.db.execute('''CREATE TABLE daily_operations (
            service_day DATE, city_group VARCHAR, weather VARCHAR,
            requested_orders INTEGER, completed_orders INTEGER,
            fulfillment_rate DOUBLE, avg_delivery_minutes DOUBLE, cost_per_order DOUBLE,
            total_delivery_minutes DOUBLE, total_cost DOUBLE
        )''')
        self.db.executemany('INSERT INTO daily_operations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', rows)

    def test_sample_averages_use_completed_order_counts(self):
        self.db.execute(f"CREATE VIEW daily_operations AS {QUERIES['daily_operations']}")
        rows = self.result('daily_operations')
        summary = self.result('summary')[0]
        completed = sum(row['completed_orders'] for row in rows)
        delivery = sum(float(row['avg_delivery_minutes']) * row['completed_orders'] for row in rows) / completed
        cost = sum(float(row['cost_per_order']) * row['completed_orders'] for row in rows) / completed
        self.assertAlmostEqual(summary['avg_delivery_minutes'], delivery)
        self.assertAlmostEqual(summary['avg_cost_per_order'], cost)
        self.assertAlmostEqual(summary['fulfillment_rate'], 638 / 700)

    def test_summary_respects_unequal_order_volumes(self):
        self.fixture([
            ('2025-01-01', 'North', 'Rain', 2, 1, .5, 100, 10, 100, 10),
            ('2025-01-02', 'North', 'Rain', 1100, 1000, 1000 / 1100, 10, 1, 10000, 1000),
        ])
        summary = self.result('summary')[0]
        self.assertAlmostEqual(summary['avg_delivery_minutes'], 10100 / 1001)
        self.assertAlmostEqual(summary['avg_cost_per_order'], 1010 / 1001)
        self.assertAlmostEqual(summary['fulfillment_rate'], 1001 / 1102)

    def test_weather_slice_uses_the_same_denominator(self):
        self.fixture([
            ('2025-01-01', 'North', 'Rain', 2, 1, .5, 100, 10, 100, 10),
            ('2025-01-02', 'North', 'Rain', 1100, 1000, 1000 / 1100, 10, 1, 10000, 1000),
        ])
        weather = self.result('by_weather')[0]
        self.assertAlmostEqual(weather['avg_delivery_minutes'], 10100 / 1001)
        self.assertAlmostEqual(weather['avg_cost_per_order'], 1010 / 1001)

    def test_zero_completed_orders_has_no_delivery_average(self):
        self.fixture([('2025-01-01', 'North', 'Rain', 20, 0, 0, 0, 0, 0, 0)])
        for name in ('summary', 'by_weather'):
            result = self.result(name)[0]
            self.assertIsNone(result['avg_delivery_minutes'])
            self.assertIsNone(result['avg_cost_per_order'])
            self.assertEqual(result['fulfillment_rate'], 0)

    def test_zero_requested_orders_has_no_fulfillment_rate(self):
        self.fixture([('2025-01-01', 'North', 'Rain', 0, 0, 0, 0, 0, 0, 0)])
        for name in ('summary', 'by_weather'):
            self.assertIsNone(self.result(name)[0]['fulfillment_rate'])


if __name__ == '__main__':
    unittest.main()
