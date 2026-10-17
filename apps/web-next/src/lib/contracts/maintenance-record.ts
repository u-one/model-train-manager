import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, '日付は YYYY-MM-DD 形式で入力してください')

export const maintenanceRecordInputSchema = z.object({
  maintenanceDate: dateOnly,
  content: z.string().trim().min(1, '内容を入力してください').max(5000)
}).strict()

export type MaintenanceRecordInput = z.infer<typeof maintenanceRecordInputSchema>
