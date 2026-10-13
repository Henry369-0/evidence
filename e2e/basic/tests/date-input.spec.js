// @ts-check
import { test, expect } from '@playwright/test';

const presetCases = [
	['Last 7 Days', ['2025-01-09', '2025-01-15'], ['2026-02-09', '2026-02-15']],
	['Last 30 Days', ['2024-12-17', '2025-01-15'], ['2026-01-17', '2026-02-15']],
	['Last 90 Days', ['2024-10-18', '2025-01-15'], ['2025-11-18', '2026-02-15']],
	['Last 365 Days', ['2024-01-17', '2025-01-15'], ['2025-02-16', '2026-02-15']],
	['Last 3 Months', ['2024-10-01', '2024-12-31'], ['2025-11-01', '2026-01-31']],
	['Last 6 Months', ['2024-07-01', '2024-12-31'], ['2025-08-01', '2026-01-31']],
	['Last 12 Months', ['2024-01-01', '2024-12-31'], ['2025-02-01', '2026-01-31']],
	['Last Month', ['2024-12-01', '2024-12-31'], ['2026-01-01', '2026-01-31']],
	['Last Year', ['2024-01-01', '2024-12-31'], ['2025-01-01', '2025-12-31']],
	['Month to Date', ['2025-01-01', '2025-01-31'], ['2026-02-01', '2026-02-28']],
	['Month to Today', ['2025-01-01', '2025-01-15'], ['2026-02-01', '2026-02-15']],
	['Year to Date', ['2025-01-01', '2025-12-31'], ['2026-01-01', '2026-12-31']],
	['Year to Today', ['2025-01-01', '2025-01-15'], ['2026-01-01', '2026-02-15']],
	['All Time', ['2024-01-01', '2025-01-15'], ['2025-01-01', '2026-02-15']]
];

for (const timezoneId of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
	test.describe(`DateInput calendar values in ${timezoneId}`, () => {
		test.use({ timezoneId });

		async function expectValue(page, value) {
			await expect
				.poll(async () => {
					const stored = await page.locator('#stored').textContent();
					return JSON.parse(stored ?? '{}').review_date;
				})
				.toEqual(value);
		}

		test('defaults, user selection, bounds, and serialized restoration', async ({ page }) => {
			await page.goto('/date-input-regression');
			await expectValue(page, { value: '2024-12-29' });
			await page.getByRole('button', { name: 'Dec 29, 2024' }).click();
			await expect(page.getByRole('application')).toHaveAttribute('aria-label', /December 2024/);
			await expect(
				page.getByRole('button', { name: 'Sunday, December 29, 2024', exact: true })
			).toHaveAttribute('data-selected', 'true');
			await page.getByRole('button', { name: 'Next', exact: true }).click();
			await page.getByRole('button', { name: 'Wednesday, January 15, 2025', exact: true }).click();
			await page.keyboard.press('Escape');
			await expect(page.getByRole('application')).toHaveCount(0);
			await expectValue(page, { value: '2025-01-15' });
			await page.getByRole('button', { name: 'Jan 15, 2025' }).click();
			await expect(
				page.getByRole('button', { name: 'Wednesday, January 15, 2025', exact: true })
			).toHaveAttribute('data-selected', 'true');
			await page.keyboard.press('Escape');
			await expect(page.getByRole('application')).toHaveCount(0);
			await page.getByRole('button', { name: 'Narrow allowed range', exact: true }).click();
			await expectValue(page, { value: '2025-01-15' });

			const saved = JSON.parse((await page.locator('#stored').textContent()) ?? '{}').review_date
				.value;
			await page.getByRole('button', { name: 'Unmount', exact: true }).click();
			await expect(page.getByRole('application')).toHaveCount(0);
			await page.getByRole('button', { name: 'Remount', exact: true }).click();
			await expectValue(page, { value: '2025-01-01' });
			await page.getByRole('button', { name: 'Jan 1, 2025' }).click();
			await expect(page.getByRole('application')).toHaveAttribute('aria-label', /January 2025/);
			await expect(
				page.getByRole('button', { name: 'Wednesday, January 1, 2025', exact: true })
			).toHaveAttribute('data-selected', 'true');
			await page.goto(`/date-input-regression?default=${saved}`);
			await expectValue(page, { value: '2025-01-15' });
		});

		test('invalidated default falls back to the current legal start', async ({ page }) => {
			await page.goto('/date-input-regression');
			await page.getByRole('button', { name: 'Narrow allowed range', exact: true }).click();
			await expectValue(page, { value: '2025-01-01' });
		});

		for (const value of ['2024-02-31', '2024-99-99', '2026-01-01', 'not-a-date']) {
			test(`rejects invalid or out-of-bounds default ${value}`, async ({ page }) => {
				await page.goto(`/date-input-regression?default=${value}`);
				await expectValue(page, { value: '2024-01-01' });
			});
		}

		test('range preset writes calendar dates without a UTC shift', async ({ page }) => {
			await page.goto('/date-input-regression?range=true&default=Last%207%20Days');
			await expectValue(page, { start: '2025-01-25', end: '2025-01-31' });
			await page.getByRole('button', { name: 'Jan 25, 2025' }).click();
			await expect(
				page.getByRole('button', { name: 'Saturday, January 25, 2025', exact: true })
			).toHaveAttribute('data-selection-start', 'true');
			await expect(
				page.getByRole('button', { name: 'Friday, January 31, 2025', exact: true })
			).toHaveAttribute('data-selection-end', 'true');
		});

		for (const [label, initial, shifted] of presetCases) {
			test(`preserves ${label} semantics and recalculates it after bounds change`, async ({
				page
			}) => {
				await page.goto(
					`/date-input-regression?range=true&end=2025-01-15&default=${encodeURIComponent(label)}`
				);
				await expectValue(page, { start: initial[0], end: initial[1] });
				await expect(page.getByRole('combobox')).toHaveText(label);
				await page.getByRole('button', { name: 'Shift bounds to next year', exact: true }).click();
				await expectValue(page, { start: shifted[0], end: shifted[1] });
				await expect(page.getByRole('combobox')).toHaveText(label);
			});
		}

		test('reselecting the current day keeps its store value and highlight', async ({ page }) => {
			await page.goto('/date-input-regression?default=2025-01-15');
			await page.getByRole('button', { name: 'Jan 15, 2025' }).click();
			const day = page.getByRole('button', { name: 'Wednesday, January 15, 2025', exact: true });
			await day.click();
			await expectValue(page, { value: '2025-01-15' });
			await expect(day).toHaveAttribute('data-selected', 'true');
		});

		test('a user-picked range stores and highlights matching endpoints', async ({ page }) => {
			await page.goto('/date-input-regression?range=true&default=Last%207%20Days');
			await page.getByRole('button', { name: 'Jan 25, 2025' }).click();
			await page.getByRole('button', { name: 'Wednesday, January 8, 2025', exact: true }).click();
			await page.getByRole('button', { name: 'Sunday, January 12, 2025', exact: true }).click();
			await expectValue(page, { start: '2025-01-08', end: '2025-01-12' });
			await expect(
				page.getByRole('button', { name: 'Wednesday, January 8, 2025', exact: true })
			).toHaveAttribute('data-selection-start', 'true');
			await expect(
				page.getByRole('button', { name: 'Sunday, January 12, 2025', exact: true })
			).toHaveAttribute('data-selection-end', 'true');
		});
	});
}
