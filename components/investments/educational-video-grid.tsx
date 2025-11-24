"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Youtube } from "lucide-react"
import Image from "next/image"
import { FinancialEducationChannel } from "@/lib/investments/types"

interface EducationalVideoGridProps {
  channels: FinancialEducationChannel[]
}

export function EducationalVideoGrid({ channels }: EducationalVideoGridProps) {
  if (!channels.length) {
    return <div className="text-center py-4">No channels found matching your search criteria.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <Card key={channel.id} className="overflow-hidden flex flex-col">
          <div className="relative h-40 w-full">
            <Image
              src={channel.thumbnail}
              alt={channel.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <Badge variant="secondary" className="bg-black/70 text-white hover:bg-black/80">
                <Youtube className="h-3 w-3 mr-1" />
                YouTube
              </Badge>
            </div>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{channel.name}</CardTitle>
            <CardDescription className="line-clamp-2">{channel.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 flex-grow">
            <div className="flex flex-wrap gap-1">
              {channel.topics.slice(0, 3).map((topic, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {channel.topics.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{channel.topics.length - 3} more
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-2">
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={channel.url} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4 mr-2" />
                Visit Channel
              </a>
            </Button>
            
            <div className="flex gap-2 w-full">
              {channel.featuredVideo && (
                <Button asChild variant="ghost" size="sm" className="flex-1">
                  <a href={channel.featuredVideo} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Featured Video
                  </a>
                </Button>
              )}
              {channel.featuredPlaylist && (
                <Button asChild variant="ghost" size="sm" className="flex-1">
                  <a href={channel.featuredPlaylist} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Playlist
                  </a>
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
