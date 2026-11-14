import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

// A uPlot canvas filling its box. uPlot is imperative, so the chart is rebuilt only when `deps`
// changes; anything its hooks need between rebuilds (hover setters) must be stable.
type UPlotChartProps = {
  options: Omit<uPlot.Options, 'width' | 'height'>
  data: uPlot.AlignedData
  deps: string
  chartRef?: RefObject<uPlot | undefined>
  className?: string
}

export function UPlotChart({ options, data, deps, chartRef, className }: UPlotChartProps) {
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef({ options, data })
  useLayoutEffect(() => {
    latest.current = { options, data }
  })

  useEffect(() => {
    const el = box.current!
    const u = new uPlot({ ...latest.current.options, width: el.clientWidth, height: el.clientHeight }, latest.current.data, el)
    if (chartRef) chartRef.current = u
    const resize = new ResizeObserver(() => u.setSize({ width: el.clientWidth, height: el.clientHeight }))
    resize.observe(el)
    return () => {
      resize.disconnect()
      u.destroy()
      if (chartRef) chartRef.current = undefined
    }
  }, [deps, chartRef])

  return <div ref={box} className={className} />
}

