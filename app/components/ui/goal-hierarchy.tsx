import type { Goal } from "@/app/db/types"
import { CheckCircle2 } from "lucide-react"

interface GoalHierarchyProps {
  goals: Goal[]
  level?: number
}

export default function GoalHierarchy({ goals, level = 0 }: GoalHierarchyProps) {
  if (!goals || goals.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-4 ${level === 0 ? "justify-center" : ""}`}>
      {goals.map((goal) => (
        <div key={goal.id} className={`flex-grow ${level === 0 ? "basis-64 max-w-xs" : "w-full"}`}>
          <div
            className={`
            p-4 rounded-lg border bg-white shadow-sm h-full
            ${level === 0 ? "border-primary" : "border-gray-200"}
          `}
          >
            <h3 className={`font-medium ${level === 0 ? "text-lg" : "text-base"} mb-2`}>{goal.title}</h3>

            {goal.tasks && goal.tasks.length > 0 && (
              <div className="space-y-2">
                {goal.tasks.map((task) => (
                  <div key={task.id} className="flex items-center text-sm text-red-600">
                    <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            )}

            {goal.children && goal.children.length > 0 && (
              <div className="mt-4 pl-4 border-l border-gray-300">
                <GoalHierarchy goals={goal.children} level={level + 1} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
