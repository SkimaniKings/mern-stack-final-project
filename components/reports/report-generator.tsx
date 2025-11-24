"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { generateReport, ReportRequest, ReportType, ReportFormat, TimeRange } from "@/app/actions/reports"
import { Loader2 } from "lucide-react"

// Define the allowed report types
const ALLOWED_REPORT_TYPES = [
  'income-sources',
  'expense-trends',
  'net-worth',
  'savings-goals',
  'debt'
] as const;

const reportFormSchema = z.object({
  type: z.enum(ALLOWED_REPORT_TYPES),
  format: z.enum(["csv", "excel"] as const),
  timeRange: z.enum(["7d", "30d", "90d", "1y", "ytd", "all", "custom"] as const),
  title: z.string().optional(),
  description: z.string().optional(),
  customDateRange: z.object({
    startDate: z.string(),
    endDate: z.string()
  }).optional()
})

type ReportFormValues = z.infer<typeof reportFormSchema>

export function ReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      type: "income-sources",
      format: "csv",
      timeRange: "30d",
      title: "",
      description: ""
    },
  })

  async function onSubmit(data: ReportFormValues) {
    setIsGenerating(true)
    try {
      // Build the report request with all options
      const reportRequest: ReportRequest = {
        type: data.type as ReportType,
        format: data.format as ReportFormat,
        timeRange: data.timeRange as TimeRange,
        title: data.title || undefined,
        description: data.description || undefined,
      }

      // Add custom date range if selected
      if (data.timeRange === 'custom' && data.customDateRange) {
        reportRequest.customDateRange = data.customDateRange
      }

      // Add comparison options if enabled
      if (data.comparisonEnabled && data.comparisonType !== 'none') {
        reportRequest.comparisonType = data.comparisonType
        reportRequest.comparisonTimeRange = data.comparisonTimeRange
        
        if (data.comparisonType === 'custom' && data.comparisonCustomDateRange) {
          reportRequest.comparisonCustomDateRange = data.comparisonCustomDateRange
        }
      }

      // Add advanced options if enabled
      if (data.advancedOptions) {
        reportRequest.dataFilters = data.dataFilters
        reportRequest.groupBy = data.groupBy
        reportRequest.sortBy = data.sortBy
        reportRequest.sortDirection = data.sortDirection
        reportRequest.includeCharts = data.includeCharts
        reportRequest.chartTypes = data.chartTypes
      }

      await generateReport(reportRequest)
      toast.success("Report generation started", {
        description: "You'll be notified when your report is ready",
      })
      router.refresh()
      form.reset()
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report", {
        description: "Please try again later",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
        <CardDescription>
          Create a custom report based on your financial data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income-sources">Income Sources</SelectItem>
                      <SelectItem value="expense-trends">Expense Trends</SelectItem>
                      <SelectItem value="net-worth">Net Worth</SelectItem>
                      <SelectItem value="savings-goals">Savings Goals</SelectItem>
                      <SelectItem value="debt">Debt Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the type of financial data to include in your report
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the file format for your report
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Range</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    // Reset custom date range when switching to predefined range
                    if (value !== 'custom') {
                      form.setValue('customDateRange', undefined);
                    }
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the time period to include in your report
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('timeRange') === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customDateRange.startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customDateRange.endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a custom title for your report" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave blank to use a default title based on the report type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes or context for this report"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            {form.watch('advancedOptions') && (
              <div className="space-y-6 rounded-lg border p-4">
                <h3 className="text-lg font-medium">Advanced Report Options</h3>
                
                {/* Comparison Options */}
                <FormField
                  control={form.control}
                  name="comparisonEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Comparison</FormLabel>
                        <FormDescription>
                          Compare data with another time period
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('comparisonEnabled') && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    <FormField
                      control={form.control}
                      name="comparisonType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comparison Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select comparison type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="previous-period">Previous Period</SelectItem>
                              <SelectItem value="year-over-year">Year Over Year</SelectItem>
                              <SelectItem value="custom">Custom Period</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How to compare your data
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {form.watch('comparisonType') === 'custom' && (
                      <>
                        <FormField
                          control={form.control}
                          name="comparisonTimeRange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comparison Time Range</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value);
                                if (value !== 'custom') {
                                  form.setValue('comparisonCustomDateRange', undefined);
                                }
                              }} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select time range" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="7d">Last 7 Days</SelectItem>
                                  <SelectItem value="30d">Last 30 Days</SelectItem>
                                  <SelectItem value="90d">Last 90 Days</SelectItem>
                                  <SelectItem value="1y">Last Year</SelectItem>
                                  <SelectItem value="ytd">Year to Date</SelectItem>
                                  <SelectItem value="all">All Time</SelectItem>
                                  <SelectItem value="custom">Custom Date Range</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {form.watch('comparisonTimeRange') === 'custom' && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="comparisonCustomDateRange.startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="comparisonCustomDateRange.endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Data Filtering Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Data Filters</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dataFilters.minAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dataFilters.maxAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1000.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Grouping and Sorting */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="groupBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group By</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grouping" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="quarter">Quarter</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="account">Account</SelectItem>
                            <SelectItem value="tag">Tag</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sortBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort By</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sorting" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Chart Options */}
                <FormField
                  control={form.control}
                  name="includeCharts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Include Charts</FormLabel>
                        <FormDescription>
                          Add visual charts to your report
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
