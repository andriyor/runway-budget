// value below which a share q (0–1) of the values fall, interpolating between the two nearest
export const quantile = (values: number[], q: number) => {
  const sorted = values.toSorted((a, b) => a - b)
  const at = (sorted.length - 1) * q
  const below = Math.floor(at)
  return sorted[below] + (sorted[Math.ceil(at)] - sorted[below]) * (at - below)
}

export const median = (values: number[]) => quantile(values, 0.5)
