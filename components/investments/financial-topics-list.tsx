"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Youtube } from "lucide-react"
import { FinancialTopic, RecommendedChannel } from "@/lib/investments/types"

interface FinancialTopicsListProps {
  topics: FinancialTopic[]
}

export function FinancialTopicsList({ topics }: FinancialTopicsListProps) {
  if (!topics.length) {
    return <div className="text-center py-4">No topics found matching your search criteria.</div>
  }

  return (
    <div className="grid gap-4">
      {topics.map((topic) => (
        <Card key={topic.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${topic.colorClass}`}>
                  {topic.icon}
                </div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
              </div>
              <Badge variant={topic.difficulty === "Beginner" ? "outline" : 
                        topic.difficulty === "Intermediate" ? "secondary" : "default"}>
                {topic.difficulty}
              </Badge>
            </div>
            <CardDescription className="mt-2">{topic.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex flex-wrap gap-1">
              {topic.keywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {topic.recommendedChannels.map((channel: RecommendedChannel, index) => (
                <div key={index} className="flex items-center text-sm">
                  <Youtube className="h-3 w-3 mr-1 text-red-500" />
                  <a 
                    href={channel.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate"
                    title={channel.name}
                  >
                    {channel.name}
                    {channel.videoUrl && " (Video)"}
                    {channel.playlistUrl && " (Playlist)"}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" className="ml-auto">
              Explore Topic
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
