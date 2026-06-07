import { polarToCartesian, buildSegments } from './donut-chart'

describe('polarToCartesian', () => {
  test('0° points to top (12 o\'clock)', () => {
    const pt = polarToCartesian(50, 50, 45, 0)
    expect(pt.x).toBeCloseTo(50, 1)
    expect(pt.y).toBeCloseTo(5, 1)   // cy - r = 50 - 45 = 5
  })

  test('90° points to right', () => {
    const pt = polarToCartesian(50, 50, 45, 90)
    expect(pt.x).toBeCloseTo(95, 1)  // cx + r = 50 + 45 = 95
    expect(pt.y).toBeCloseTo(50, 1)
  })
})

describe('buildSegments', () => {
  const positions = [
    { name: '台積電', code: '2330', value: 450000, color: '#4f46e5' },
    { name: '聯發科', code: '2454', value: 450000, color: '#7c3aed' },
  ]

  test('returns one segment per position', () => {
    const segs = buildSegments(positions)
    expect(segs).toHaveLength(2)
  })

  test('percentages sum to 100', () => {
    const segs = buildSegments(positions)
    const total = segs.reduce((s, seg) => s + seg.pct, 0)
    expect(total).toBeCloseTo(100, 5)
  })

  test('equal values produce 50% each', () => {
    const segs = buildSegments(positions)
    expect(segs[0].pct).toBeCloseTo(50, 5)
    expect(segs[1].pct).toBeCloseTo(50, 5)
  })

  test('each segment has a non-empty d path string', () => {
    const segs = buildSegments(positions)
    segs.forEach(seg => {
      expect(typeof seg.d).toBe('string')
      expect(seg.d.length).toBeGreaterThan(0)
    })
  })

  test('handles single position (100%)', () => {
    const segs = buildSegments([positions[0]])
    expect(segs).toHaveLength(1)
    expect(segs[0].pct).toBeCloseTo(100, 5)
  })
})
