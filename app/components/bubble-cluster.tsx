"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/app/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tilt } from "@/app/components/ui/tilt"
import type { ClusterWithGoals } from "@/app/db/types"
import { Edit, Link, Target, ChevronDown, ChevronUp } from "lucide-react"
import GoalHierarchy from "./ui/goal-hierarchy"
import Image from "next/image"

interface BubbleClusterProps {
  cluster: ClusterWithGoals
  onClick: (cluster: ClusterWithGoals) => void
  onRename: (clusterId: string, newTitle: string) => void
  onGenerateGoals: (cluster: ClusterWithGoals) => void
  isSelected: boolean
}

export default function BubbleCluster({ cluster, onClick, onRename, onGenerateGoals, isSelected }: BubbleClusterProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showUrlsDialog, setShowUrlsDialog] = useState(false)
  const [newTitle, setNewTitle] = useState(cluster.title)
  const [showGoals, setShowGoals] = useState(false)
  const clusterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShowGoals(isSelected)
  }, [isSelected])

  const getClusterColor = (id: string) => {
    const colors = ["bg-blue-50", "bg-green-50", "bg-purple-50", "bg-amber-50", "bg-rose-50"]
    return colors[Number.parseInt(id) % colors.length]
  }

  const handleRename = () => {
    onRename(cluster.id, newTitle)
    setShowRenameDialog(false)
  }

  const handleCreateGoals = () => {
    onGenerateGoals(cluster);
  }

  const toggleGoals = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowGoals(!showGoals)
    onClick(cluster)
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-sm">
        <ContextMenu>
          <ContextMenuTrigger>
            <Tilt
              rotationFactor={8}
              isRevese
              className="w-full"
              springOptions={{
                stiffness: 300,
                damping: 30,
              }}
            >
              <Card
                ref={clusterRef}
                className={`w-full overflow-hidden ${getClusterColor(cluster.id)} cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary ring-opacity-50" : ""
                }`}
                onClick={() => onClick(cluster)}
              >
                <div className="relative h-48 w-full">
                  <Image
                    src="https://images.beta.cosmos.so/f7fcb95d-981b-4cb3-897f-e35f6c20e830?format=jpeg"
                    alt="Ghost in the Shell - Kôkaku kidôtai"
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{cluster.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3">{cluster.description}</p>
                  <button
                    className="absolute bottom-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:shadow transition-shadow"
                    onClick={toggleGoals}
                  >
                    {showGoals ? (
                      <ChevronUp size={18} className="text-gray-600" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-600" />
                    )}
                  </button>
                </CardContent>
              </Card>
            </Tilt>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleCreateGoals}>
              <Target className="mr-2 h-4 w-4" />
              Create Goals
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setShowUrlsDialog(true)}>
              <Link className="mr-2 h-4 w-4" />
              View URLs
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setShowRenameDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename Cluster
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {showGoals && (
        <div className="mt-4 w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-0.5 h-4 bg-gray-300 mx-auto" />
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <GoalHierarchy goals={cluster.goals} />
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Cluster</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new cluster name"
            className="my-4"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URLs Dialog */}
      <Dialog open={showUrlsDialog} onOpenChange={setShowUrlsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URLs for {cluster.title}</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <ul className="space-y-2">
              {cluster.urls?.map((url, index) => (
                <li key={index}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <Link className="mr-2 h-4 w-4" />
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUrlsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
