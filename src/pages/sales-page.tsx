import { useSearchParams } from 'react-router'
import { useSalesSummary } from '../api/queries'
import type { SalesPoint, SalesRange, SalesSummary } from '../api/types'
import { PageHeader } from '../components/app-shell'
import { ErrorState, LoadingState } from '../components/async-state'
import { formatInteger, formatMoney, formatMoneyCompact, formatMoneyWhole, formatPercent } from '../lib/format'

const ranges: Array<{ value: SalesRange; label: string; comparison: string }> = [
  { value: 'today', label: 'Today', comparison: 'vs yesterday' },
  { value: '7d', label: 'Last 7 days', comparison: 'vs previous 7 days' },
]

export function SalesPage() {
  const [params, setParams] = useSearchParams()
  const range: SalesRange = params.get('range') === '7d' ? '7d' : 'today'
  const summary = useSalesSummary(range)
  const rangeInfo = ranges.find((r) => r.value === range) ?? ranges[0]!

  return (
    <div className="page">
      <PageHeader
        title="Sales"
        description="Revenue, order count and best sellers. Demo figures for a full service day."
        actions={
          <div className="segmented" role="group" aria-label="Period">
            {ranges.map((r) => (
              <button key={r.value} type="button" aria-pressed={range === r.value} onClick={() => setParams(r.value === 'today' ? {} : { range: r.value }, { replace: true })}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {summary.isPending ? (
        <LoadingState label="Loading sales…" rows={5} />
      ) : summary.isError ? (
        <ErrorState title="Couldn't load sales" error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
      ) : (
        <div className={`sales ${summary.isFetching ? 'is-refreshing' : ''}`}>
          <div className="kpis">
            <Kpi label="Revenue" value={formatMoneyWhole(summary.data.revenue)} current={summary.data.revenue} previous={summary.data.previous.revenue} comparison={rangeInfo.comparison} />
            <Kpi label="Orders" value={formatInteger(summary.data.orders)} current={summary.data.orders} previous={summary.data.previous.orders} comparison={rangeInfo.comparison} />
            <Kpi
              label="Average ticket"
              value={formatMoneyWhole(summary.data.averageTicket)}
              current={summary.data.averageTicket}
              previous={summary.data.previous.averageTicket}
              comparison={rangeInfo.comparison}
            />
          </div>
          <div className="sales-grid">
            <RevenueChart summary={summary.data} />
            <TopItems summary={summary.data} />
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, current, previous, comparison }: { label: string; value: string; current: number; previous: number; comparison: string }) {
  const change = previous === 0 ? 0 : (current - previous) / previous
  const up = change >= 0
  return (
    <section className="card kpi" aria-label={label}>
      <h2 className="kpi__label">{label}</h2>
      <p className="kpi__value">{value}</p>
      <p className={`kpi__delta ${up ? 'is-up' : 'is-down'}`}>
        <span aria-hidden="true">{up ? '▲' : '▼'}</span> {up ? 'Up' : 'Down'} {formatPercent(Math.abs(change))} {comparison}
      </p>
    </section>
  )
}

function niceMax(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

function RevenueChart({ summary }: { summary: SalesSummary }) {
  const points: SalesPoint[] = summary.series
  const title = summary.range === 'today' ? 'Revenue by hour' : 'Revenue by day'
  const width = 720
  const height = 260
  const pad = { top: 28, right: 8, bottom: 28, left: 56 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(...points.map((p) => p.revenue)))
  const peak = points.reduce((best, p) => (p.revenue > best.revenue ? p : best), points[0]!)
  const slot = plotW / points.length
  const barW = Math.min(44, slot * 0.64)
  const y = (value: number) => pad.top + plotH - (value / max) * plotH
  const ticks = [0, max / 2, max]

  return (
    <section className="card chart-card">
      <h2 className="card__title">{title}</h2>
      <p className="card__subtitle">
        Busiest {summary.range === 'today' ? 'hour' : 'day'}: <strong>{peak.label}</strong> with {formatMoneyWhole(peak.revenue)}
      </p>
      <svg className="bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. Peak at ${peak.label}, ${formatMoneyWhole(peak.revenue)}.`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="bar-chart__grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
            <text className="bar-chart__axis" x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
              {formatMoneyCompact(tick)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const x = pad.left + slot * index + (slot - barW) / 2
          const isPeak = point === peak
          return (
            <g key={point.label}>
              <rect className={`bar-chart__bar ${isPeak ? 'is-peak' : ''}`} x={x} y={y(point.revenue)} width={barW} height={pad.top + plotH - y(point.revenue)} rx="3">
                <title>{`${point.label}: ${formatMoney(point.revenue)}`}</title>
              </rect>
              {isPeak && (
                <text className="bar-chart__value" x={x + barW / 2} y={y(point.revenue) - 8} textAnchor="middle">
                  {formatMoneyCompact(point.revenue)}
                </text>
              )}
              <text className="bar-chart__axis" x={x + barW / 2} y={height - 8} textAnchor="middle">
                {summary.range === 'today' ? point.label.slice(0, 2) : point.label}
              </text>
            </g>
          )
        })}
      </svg>
      <details className="numbers">
        <summary>Show the numbers</summary>
        <table className="table table--compact">
          <thead>
            <tr>
              <th scope="col">{summary.range === 'today' ? 'Hour' : 'Day'}</th>
              <th scope="col" className="align-right">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <td>{point.label}</td>
                <td className="align-right num">{formatMoney(point.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function TopItems({ summary }: { summary: SalesSummary }) {
  const best = summary.topItems[0]?.revenue ?? 1
  return (
    <section className="card">
      <h2 className="card__title">Best sellers</h2>
      <p className="card__subtitle">Top 5 dishes by revenue</p>
      <ol className="top-items">
        {summary.topItems.map((item, index) => (
          <li key={item.menuItemId} className="top-item">
            <div className="top-item__row">
              <span className="top-item__name">
                <span className="top-item__rank">{index + 1}</span>
                {item.name}
              </span>
              <span className="num">{formatMoneyWhole(item.revenue)}</span>
            </div>
            <div className="top-item__bar" aria-hidden="true">
              <span style={{ width: `${(item.revenue / best) * 100}%` }} />
            </div>
            <span className="top-item__meta">{formatInteger(item.quantity)} sold</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
