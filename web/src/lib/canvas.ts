import type uPlot from 'uplot'

// canvas can't read CSS variables, so colors like --series-1 are resolved from the chart's element
export const cssVar = (u: uPlot, name: string) => getComputedStyle(u.root).getPropertyValue(name).trim()

// the text color around the chart, for labels drawn on the canvas
export const textColor = (u: uPlot) => getComputedStyle(u.root).color
