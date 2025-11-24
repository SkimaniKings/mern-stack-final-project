"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { EducationalVideoGrid } from "@/components/investments/educational-video-grid"
import { FinancialTopicsList } from "@/components/investments/financial-topics-list"
import { ArrowLeft, Search, BookOpen, Youtube, Lightbulb } from "lucide-react"
import Link from "next/link"
import { financialEducationChannels, financialTopics } from "@/lib/investments/financial-education"

export default function FinancialEducationPage() {
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("topics")

  // Filter channels based on search term
  const filteredChannels = financialEducationChannels.filter((channel) => {
    if (!searchTerm) return true
    return (
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  // Filter topics based on search term
  const filteredTopics = financialTopics.filter((topic) => {
    if (!searchTerm) return true
    return (
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Education Hub</h1>
          <p className="text-muted-foreground">
            Learn about personal finance, investing, and money management from trusted sources
          </p>
        </div>
        <Link href="/investments/portfolio">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics, channels, or keywords..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Why Financial Education Matters</CardTitle>
          <CardDescription>Building wealth starts with knowledge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Financial literacy is the foundation of personal wealth building. Understanding how money works
            empowers you to make informed decisions about saving, investing, and managing debt.
          </p>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold text-primary">78%</span>
              <span className="text-sm text-muted-foreground">
                of Americans live paycheck to paycheck
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold text-primary">33%</span>
              <span className="text-sm text-muted-foreground">
                have $0 saved for retirement
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold text-primary">40%</span>
              <span className="text-sm text-muted-foreground">
                couldn't cover a $400 emergency
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold text-primary">16%</span>
              <span className="text-sm text-muted-foreground">
                of Americans are financially literate
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="topics" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="topics">Financial Topics</TabsTrigger>
          <TabsTrigger value="channels">Educational Channels</TabsTrigger>
        </TabsList>
        <TabsContent value="topics" className="space-y-4">
          <FinancialTopicsList topics={filteredTopics} />
        </TabsContent>
        <TabsContent value="channels" className="space-y-4">
          <EducationalVideoGrid channels={filteredChannels} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
