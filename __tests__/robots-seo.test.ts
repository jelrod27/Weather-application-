/**
 * Tests for robots.txt AI crawler policy (search/browse vs training bots).
 */

import fs from 'fs'
import path from 'path'

const ROBOTS_PATH = path.join(process.cwd(), 'public', 'robots.txt')

function readRobots(): string {
  return fs.readFileSync(ROBOTS_PATH, 'utf-8')
}

/** Returns rule lines for a specific User-agent block (until the next User-agent or EOF). */
function getAgentBlock(content: string, agent: string): string {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line.trim() === `User-agent: ${agent}`)
  if (start === -1) return ''

  const block: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('User-agent:')) break
    block.push(line)
  }
  return block.join('\n')
}

function blockAllowsRoot(block: string): boolean {
  return /Allow:\s*\//.test(block)
}

function blockDisallowsAll(block: string): boolean {
  return /Disallow:\s*\/\s*$/.test(block.trim()) || /Disallow:\s*\/\r?$/m.test(block)
}

describe('robots.txt AI crawler policy', () => {
  let content: string

  beforeAll(() => {
    content = readRobots()
  })

  it('allows AI search and browse bots on public content', () => {
    const searchBots = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot']
    for (const agent of searchBots) {
      const block = getAgentBlock(content, agent)
      expect(block).not.toBe('')
      expect(blockAllowsRoot(block)).toBe(true)
      expect(blockDisallowsAll(block)).toBe(false)
    }
  })

  it('blocks AI training crawlers site-wide', () => {
    const trainingBots = ['GPTBot', 'CCBot', 'anthropic-ai', 'Claude-Web']
    for (const agent of trainingBots) {
      const block = getAgentBlock(content, agent)
      expect(block).not.toBe('')
      expect(blockDisallowsAll(block)).toBe(true)
    }
  })

  it('keeps sensitive routes disallowed for AI search bots', () => {
    const searchBots = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot']
    const sensitivePaths = ['/api/', '/auth/', '/dashboard', '/profile']
    for (const agent of searchBots) {
      const block = getAgentBlock(content, agent)
      for (const route of sensitivePaths) {
        expect(block).toContain(`Disallow: ${route}`)
      }
    }
  })

  it('documents llms.txt discoverability file at site root', () => {
    const llmsPath = path.join(process.cwd(), 'public', 'llms.txt')
    expect(fs.existsSync(llmsPath)).toBe(true)
    const llms = fs.readFileSync(llmsPath, 'utf-8')
    expect(llms).toContain('16 Bit Weather')
    expect(llms).toContain('https://www.16bitweather.co')
  })

  it('does not allow removed stale routes in the default crawler block', () => {
    const defaultBlock = getAgentBlock(content, '*')
    expect(defaultBlock).not.toContain('Allow: /situation')
    expect(defaultBlock).not.toContain('Allow: /map')
    expect(defaultBlock).not.toContain('Allow: /hourly')
  })
})
