#!/usr/bin/env node

import { existsSync } from 'node:fs'
import path from 'node:path'

import { run } from '../dist/index.js'

try {
  let environmentPath = path.resolve('.env')
  if (existsSync(environmentPath)) {
    process.loadEnvFile(environmentPath)
  }
} finally {
  run()
}
