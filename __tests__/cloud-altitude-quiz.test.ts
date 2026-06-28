import {
  CLOUD_QUIZ_QUESTIONS,
  isCorrectCloudLayer,
} from '@/components/education/cloud-altitude-stack'

describe('cloud altitude quiz', () => {
  it('validates layer answers for each question', () => {
    for (const question of CLOUD_QUIZ_QUESTIONS) {
      expect(isCorrectCloudLayer(question, question.layer)).toBe(true)
      expect(isCorrectCloudLayer(question, 'high')).toBe(question.layer === 'high')
    }
  })

  it('includes four distinct cloud prompts', () => {
    expect(CLOUD_QUIZ_QUESTIONS).toHaveLength(4)
    expect(new Set(CLOUD_QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(4)
  })
})
