"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { money } from "@/lib/format"

const revenueConfig = {
  revenue: { label: "Revenue (AZN)", color: "var(--chart-3)" },
} satisfies ChartConfig

/** Hourly revenue through the operational day. */
export function HourlyRevenueChart({
  data,
  className,
}: {
  data: { label: string; revenue: number }[]
  className?: string
}) {
  return (
    <ChartContainer
      config={revenueConfig}
      className={className ?? "aspect-auto h-64 w-full"}
    >
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.55}
            />
            <stop
              offset="95%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.03}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={16}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={52}
          tickFormatter={(value) => money(Number(value))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => `${money(Number(value))} AZN`}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="natural"
          stroke="var(--color-revenue)"
          fill="url(#fill-revenue)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}

/** Horizontal revenue ranking — used for stations and departments. */
/**
 * Ranked horizontal bars with the figure printed on each one.
 *
 * The value used to live only in the tooltip, which means the exact number is
 * unavailable on a screen nobody is hovering — a printed board pack, a
 * screenshot in a deck, or anyone reading over a shoulder. A ranked chart
 * whose values you have to hover for is a picture of an ordering, not a set
 * of figures.
 */
export function RevenueRankChart({
  data,
  className,
}: {
  data: { label: string; revenue: number }[]
  className?: string
}) {
  return (
    <ChartContainer
      config={revenueConfig}
      className={className ?? "aspect-auto h-64 w-full"}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        {/* The axis goes: with the number on every bar it is one more set of
            digits saying the same thing. Extra headroom keeps the longest
            label inside the plot. */}
        <XAxis type="number" dataKey="revenue" hide domain={[0, "dataMax * 1.18"]} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={140}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => `${money(Number(value))} AZN`}
            />
          }
        />
        <Bar
          dataKey="revenue"
          fill="var(--color-revenue)"
          radius={6}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="revenue"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            formatter={(value) => money(Number(value ?? 0))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

const shiftConfig = {
  operators: { label: "Operators" },
  Morning: { label: "Morning", color: "var(--chart-1)" },
  Evening: { label: "Evening", color: "var(--chart-3)" },
  Night: { label: "Night", color: "var(--chart-5)" },
} satisfies ChartConfig

/** Operators per shift. */
export function ShiftDonutChart({
  data,
  className,
}: {
  data: { shift: string; operators: number }[]
  className?: string
}) {
  const total = React.useMemo(
    () => data.reduce((sum, row) => sum + row.operators, 0),
    [data]
  )

  return (
    <ChartContainer
      config={shiftConfig}
      className={className ?? "mx-auto aspect-square max-h-56"}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="shift" />}
        />
        <Pie
          data={data}
          dataKey="operators"
          nameKey="shift"
          innerRadius={54}
          outerRadius={80}
          paddingAngle={3}
          strokeWidth={0}
          isAnimationActive={false}
        >
          {data.map((row) => (
            <Cell key={row.shift} fill={`var(--color-${row.shift})`} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null
              return (
                <text
                  x={viewBox.cx}
                  y={viewBox.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy}
                    className="fill-foreground text-2xl font-semibold tabular-nums"
                  >
                    {total}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 20}
                    className="fill-muted-foreground text-xs"
                  >
                    on duty
                  </tspan>
                </text>
              )
            }}
          />
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="shift" />}
          className="flex-wrap gap-2"
        />
      </PieChart>
    </ChartContainer>
  )
}
