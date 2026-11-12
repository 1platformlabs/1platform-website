import { test, expect } from '@playwright/test'

import { editorialHomeTitle } from '../src/lib/editorial-title'

// Runs in Node, no browser: the property is about the string.
test('home title equal to the site name is not repeated', () => {
  expect(editorialHomeTitle('Péptidos GT', 'Péptidos GT')).toBe('Péptidos GT')
  expect(editorialHomeTitle(' péptidos gt ', 'Péptidos GT')).toBe('péptidos gt')
})

test('a different home title keeps «title · name»', () => {
  expect(editorialHomeTitle('Notas de laboratorio', 'Péptidos GT')).toBe('Notas de laboratorio · Péptidos GT')
})

test('no home title falls back to the name', () => {
  expect(editorialHomeTitle(null, 'Péptidos GT')).toBe('Péptidos GT')
  expect(editorialHomeTitle('   ', 'Péptidos GT')).toBe('Péptidos GT')
})
