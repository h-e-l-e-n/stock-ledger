'use client'

import { useState } from 'react'

export function sortRows(rows, sortKey, sortDir) {
  if (!sortKey) return rows
  return [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })
}
