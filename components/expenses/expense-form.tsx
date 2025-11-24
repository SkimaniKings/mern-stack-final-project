"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ensureSplitExpenseStructure } from "@/lib/database/init-split-expenses";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, MapPin, Receipt, Split, AlertTriangle, CalendarDays, User, Upload, Loader2, X, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import { getSplitExpensesByExpenseId, updateSplitExpense, deleteSplitExpense, createSplitExpense } from "@/app/actions/split-expenses";
import { uploadReceipt } from "@/lib/receipt-utils";
import { getUsersForSplitExpense } from "@/lib/split-expense-utils";
import { Expense, ExpenseCategory, RecurrenceFrequency } from "@/types/expense";
import { Category } from "@/lib/constants/categories";
import { searchLocationByName, getAddressFromCoordinates } from "@/lib/geocoding";

// Form schema
const expenseFormSchema = z.object({
  merchant: z.string().min(1, "Merchant name is required"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  currency: z.string().default("USD"),
  category_ids: z.array(z.string()).optional(),
  expense_date: z.date({
    required_error: "A date is required",
  }),
  location_name: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  recurrence: z.enum(['none', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']).default('none'),
  is_impulse: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  receipt_image: z.any().optional().nullable(),
  warranty_expiration_date: z.date().optional().nullable(),
  split_with_user: z.string().optional().nullable(),
  split_amount: z.coerce.number().optional().nullable(),
  split_note: z.string().optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExtendedExpense extends Expense {
  latitude?: number | null;
  longitude?: number | null;
  split_with_user?: string;
  split_amount?: number | null;
  split_note?: string | null;
}

interface ExpenseFormProps {
  categories: Category[];
  expense?: ExtendedExpense;
  isEditing?: boolean;
  users?: { id: string; name: string }[];
  id?: string;
  name?: string;
}

// Helper function to extract the person's name from the note field
function extractNameFromNote(note?: string | null): string {
  if (!note) return "";
  
  // Check if the note follows the pattern "Split with: [name] - [note]"
  if (note.startsWith("Split with: ")) {
    // Extract the name part
    const nameMatch = note.match(/Split with: ([^-]+)/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }
  }
  
  return "";
}

// Helper function to extract the actual note part from the combined note
function extractNoteFromCombinedNote(note?: string | null): string {
  if (!note) return "";
  
  // Check if the note follows the pattern "Split with: [name] - [note]"
  if (note.includes(" - ")) {
    const parts = note.split(" - ");
    if (parts.length > 1) {
      return parts.slice(1).join(" - ").trim();
    }
  }
  
  // If there's no actual note part, return empty string
  return "";
}

export function ExpenseForm({
  categories,
  expense,
  isEditing = false,
  users = [],
  id,
  name,
}: ExpenseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location search state
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState(users);
  
  // Initialize the database structure when the component loads
  useEffect(() => {
    const initDatabase = async () => {
      try {
        // Initialize the split expense database structure
        const success = await ensureSplitExpenseStructure();
        setDbInitialized(success);
        
        if (!success) {
          console.warn('Failed to initialize split expense database structure');
        }
      } catch (error) {
        console.error('Error initializing split expense database:', error);
      }
    };
    
    initDatabase();
  }, []);

  // Location search state
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<Array<{
    name: string;
    latitude: number;
    longitude: number;
    id: string;
  }>>([]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as any,
    defaultValues: {
      merchant: expense?.merchant || "",
      amount: expense?.amount || 0,
      currency: expense?.currency || "USD",
      category_ids: expense?.categories?.map(cat => cat.id) || [],

      expense_date: expense?.expense_date ? new Date(expense.expense_date) : new Date(),
      location_name: expense?.location_name || "",
      latitude: expense?.latitude || null,
      longitude: expense?.longitude || null,
      recurrence: expense?.recurrence || "none",
      is_impulse: expense?.is_impulse || false,
      notes: expense?.notes || "",
      receipt_image: null,
      warranty_expiration_date: expense?.warranty_expiration_date ? new Date(expense.warranty_expiration_date) : null,
      // Extract the person's name from the note field if it exists
      split_with_user: expense?.splits?.[0] ? extractNameFromNote(expense.splits[0].note) || "" : "",
      split_amount: expense?.splits?.[0]?.amount || null,
      split_note: expense?.splits?.[0]?.note || "",
    },
  });

  // Fetch users for split expense if not provided
  useEffect(() => {
    if (users.length === 0) {
      const fetchUsers = async () => {
        try {
          const userData = await getUsersForSplitExpense();
          setAvailableUsers(userData);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };

      fetchUsers();
    }
  }, [users]);

  // Populate form with expense data if editing
  useEffect(() => {
    if (expense && isEditing) {
      console.log("Initializing form with expense data:", expense);
      
      // Check if the expense has splits data directly from the API response
      const hasSplits = expense?.splits && Array.isArray(expense.splits) && expense.splits.length > 0;
      const splitData = hasSplits ? expense.splits[0] : null;
      
      // Check if we have split data either in splits array or in the expense object directly
      const hasSplitInfo = hasSplits || expense.split_with_user || expense.split_amount;
      
      // If we have split data, enable the split options UI
      if (hasSplitInfo) {
        console.log("Enabling split options based on existing data");
        setShowSplitOptions(true);
      }
      
      // Set the form values from the expense data
      form.reset({
        merchant: expense.merchant || "",
        amount: expense.amount || 0,
        currency: expense.currency || "USD",
        category_ids: expense.categories?.map((cat: any) => cat.id) || [],

        expense_date: expense.expense_date ? new Date(expense.expense_date) : new Date(),
        location_name: expense.location_name || null,
        recurrence: expense.recurrence || "none",
        is_impulse: expense.is_impulse || false,
        notes: expense.notes || null,
        receipt_image: null,
        warranty_expiration_date: expense.warranty_expiration_date ? new Date(expense.warranty_expiration_date) : null,
        // Extract the person's name from the note field
        split_with_user: extractNameFromNote(splitData?.note) || expense.split_with_user || "",
        split_amount: splitData ? splitData.amount : (expense.split_amount || null),
        // Extract the actual note part from the combined note
        split_note: extractNoteFromCombinedNote(splitData?.note) || expense.split_note || "",
        latitude: expense.latitude || null,
        longitude: expense.longitude || null,
      });

      // If we have location data, enable the location UI
      if (expense.latitude || expense.longitude) {
        setLocationEnabled(true);
        if (expense.location_name) {
          setLocationSearchQuery(expense.location_name);
        }
      }
    }
  }, [expense, isEditing, form]);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude);
          form.setValue("longitude", position.coords.longitude);
          setLocationEnabled(true);
          
          // Get address from coordinates for display
          getAddressFromCoordinates(position.coords.latitude, position.coords.longitude)
            .then(address => {
              if (address) {
                setLocationSearchQuery(address.split(',')[0] || 'Current Location');
              }
            })
            .catch(error => console.error("Error getting address:", error));
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Error",
            description: "Failed to get your location. Please try again.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
    }
  };

  // Clear location
  const clearLocation = () => {
    form.setValue("latitude", undefined);
    form.setValue("longitude", undefined);
    setLocationEnabled(false);
    setLocationSearchQuery("");
    setLocationSearchResults([]);
  };
  
  // Search for location by name
  const searchLocation = async () => {
    if (!locationSearchQuery || locationSearchQuery.trim().length < 2) {
      toast({
        title: "Search Error",
        description: "Please enter at least 2 characters to search for a location.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearchingLocation(true);
    
    try {
      const results = await searchLocationByName(locationSearchQuery);
      setLocationSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No locations found matching your search.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching for location:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingLocation(false);
    }
  };
  
  // Select a location from search results
  const selectLocation = (location: { name: string; latitude: number; longitude: number; id: string }) => {
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);
    setLocationEnabled(true);
    setLocationSearchQuery(location.name);
    setLocationSearchResults([]);
  };

  // Handle receipt image selection
  const handleReceiptChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file size - 5MB limit (5 * 1024 * 1024 bytes)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        // Clear the file input
        if (event.target) {
          event.target.value = '';
        }
        
        // Show error toast
        toast({
          title: "File Too Large",
          description: "The file exceeds the 5MB size limit. Please upload a smaller file.",
          variant: "destructive",
        });
        
        setFileName('');
        return;
      }
      
      // Set filename and create preview
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("receipt_image", file);
    } else {
      setFileName('');
    }
  };
  
  // Toggle split expense options
  const toggleSplitOptions = () => {
    setShowSplitOptions(!showSplitOptions);
    if (!showSplitOptions) {
      // When enabling split, set default values
      form.setValue("split_with_user", "");
      form.setValue("split_amount", null);
      form.setValue("split_note", "");
    } else {
      // When disabling split, clear values
      form.setValue("split_with_user", null);
      form.setValue("split_amount", null);
      form.setValue("split_note", null);
    }
  };

  // Handle form submission
  async function onSubmit(data: ExpenseFormValues) {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    setRateLimitError(false);
    
    // Show loading toast
    const toastId = toast({
      title: isEditing ? "Updating expense..." : "Creating expense...",
      description: "Please wait while we process your request.",
      variant: "default",
      duration: 5000,
    });

    try {
      // Prepare the expense data
      const expenseData = {
        merchant: data.merchant,
        amount: Number(data.amount),
        currency: data.currency,
        category_ids: data.category_ids || [],
  
        expense_date: data.expense_date,
        location_name: data.location_name || null,
        latitude: data.latitude,
        longitude: data.longitude,
        recurrence: data.recurrence || 'none',
        is_impulse: data.is_impulse || false,
        notes: data.notes || null,
        warranty_expiration_date: data.warranty_expiration_date || null,
      };
      
      let expenseId;

      // Create or update the expense
      try {
        if (isEditing && expense?.id) {
          const updateResult = await updateExpense(expense.id, expenseData);
          if (!updateResult.data) {
            throw new Error(updateResult.error?.message || "Failed to update expense");
          }
          expenseId = expense.id;
        } else {
          const createResult = await createExpense(expenseData);
          if (!createResult.data) {
            throw new Error(createResult.error?.message || "Failed to create expense");
          }
          expenseId = createResult.data.id;
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("over_request_rate_limit")) {
          setRateLimitError(true);
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
        throw error;
      }

      // Handle receipt upload if there's a receipt image
      if (fileInputRef.current?.files?.[0] && expenseId) {
        try {
          await uploadReceipt(fileInputRef.current.files[0], expenseId);
        } catch (uploadError) {
          console.error("Error uploading receipt:", uploadError);
          
          // Check if it's a file size error
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          const isFileSizeError = errorMessage.includes("5MB limit");
          
          toast({
            title: isFileSizeError ? "File Too Large" : "Receipt Upload Failed",
            description: isFileSizeError 
              ? "The file exceeds the 5MB size limit. Please upload a smaller file." 
              : "The expense was saved, but we couldn't upload the receipt.",
            variant: "destructive",
          });
        }
      }

      // Handle split expense management
      if (expenseId) {
        try {
          if (isEditing) {
            // Check for existing split expenses from the expense object directly
            // This avoids making an additional server call that might fail
            let existingSplits = [];
            
            if (expense?.splits && Array.isArray(expense.splits)) {
              existingSplits = expense.splits;
              console.log("Using splits data from expense object:", existingSplits);
            } else {
              // Only try the server action as a fallback
              try {
                existingSplits = await getSplitExpensesByExpenseId(expenseId);
                console.log("Retrieved splits from server action:", existingSplits);
              } catch (fetchError) {
                console.error("Error fetching split expenses:", fetchError);
                // Continue with empty splits array if fetch fails
              }
            }
            
            if (showSplitOptions && data.split_with_user && data.split_amount !== null) {
              // If there are existing splits, update the first one instead of creating a new one
              if (existingSplits && existingSplits.length > 0) {
                // Prepare update data with all fields to ensure complete update
                const updateData = {
                  shared_with_name: data.split_with_user,
                  amount: Number(data.split_amount),
                  note: data.split_note || null,
                  status: existingSplits[0].status || 'pending' // Preserve existing status or default to pending
                };
                
                console.log("Updating split expense with data:", updateData);
                await updateSplitExpense(existingSplits[0].id, updateData);
                console.log("Split expense updated successfully");
                
                // Delete any additional split expenses (duplicates)
                if (existingSplits.length > 1) {
                  for (let i = 1; i < existingSplits.length; i++) {
                    await deleteSplitExpense(existingSplits[i].id);
                  }
                  console.log("Removed duplicate split expenses");
                }
              } else {
                // No existing splits, create a new one
                const newSplitData = {
                  expense_id: expenseId,
                  shared_with_name: data.split_with_user, // Changed to match API expectation
                  amount: Number(data.split_amount),
                  notes: data.split_note || "" // Changed from note to notes to match API
                };
                
                console.log("Creating new split expense:", newSplitData);
                await createSplitExpense(newSplitData);
                console.log("Split expense created successfully");
              }
            } else if (!showSplitOptions && existingSplits && existingSplits.length > 0) {
              // Split options turned off but splits exist - remove them
              console.log("Removing existing split expenses as split option was disabled");
              for (const split of existingSplits) {
                await deleteSplitExpense(split.id);
              }
              console.log("Split expenses removed successfully");
            }
          } else if (showSplitOptions && data.split_with_user && data.split_amount !== null) {
            // New expense with split
            const newSplitData = {
              expense_id: expenseId,
              shared_with_name: data.split_with_user, // Changed to match API expectation
              amount: Number(data.split_amount),
              notes: data.split_note || "" // Changed from note to notes to match API
            };
            
            console.log("Creating new split expense for new expense:", newSplitData);
            await createSplitExpense(newSplitData);
            console.log("Split expense created successfully for new expense");
          }
        } catch (splitError) {
          console.error("Error managing split expense:", splitError);
          toast({
            title: "Split Expense Failed",
            description: "The expense was saved, but we couldn't manage the split record.",
            variant: "destructive",
          });
        }
      }

      // Show success message
      toast({
        title: isEditing ? "Expense Updated" : "Expense Created",
        description: `Successfully ${isEditing ? "updated" : "created"} expense for ${data.merchant}`,
      });

      // Use a small timeout to ensure the toast is shown before navigation
      setTimeout(() => {
        // Use window.location for a full page navigation instead of router.push
        // This avoids client-side routing issues with server actions
        window.location.href = "/expenses";
      }, 100);
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} expense. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        {rateLimitError && (
          <div className="mb-4 p-4 rounded-md bg-destructive/10 text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <p className="font-medium">Rate Limit</p>
                <p className="text-sm">You're making too many requests. Please wait a moment and try again.</p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Merchant Name */}
          <FormField
            control={form.control}
            name="merchant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Where did you spend?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      $
                    </span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-8" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        // If split options are shown, update split amount suggestion
                        if (showSplitOptions) {
                          const totalAmount = parseFloat(e.target.value);
                          if (!isNaN(totalAmount)) {
                            const suggestedSplitAmount = (totalAmount / 2).toFixed(2);
                            form.setValue("split_amount", suggestedSplitAmount);
                          }
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <FormField
            control={form.control}
            name="category_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categories <span className="text-red-500">*</span></FormLabel>
                
                {/* Display selected categories */}
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {field.value.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId);
                      if (!category) return null;
                      
                      return (
                        <div 
                          key={`selected-${categoryId}`}
                          className="flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: category.color || '#888' }}
                          />
                          {category.name}
                          <button 
                            type="button"
                            className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                            onClick={() => {
                              field.onChange(
                                field.value?.filter((value) => value !== categoryId) || []
                              );
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="space-y-2">
                  {categories.map((category) => {
                    // Check if we've reached the maximum of 3 categories
                    const isMaxCategoriesReached = field.value && field.value.length >= 3;
                    // Check if this category is already selected
                    const isSelected = field.value?.includes(category.id);
                    // Disable checkbox if max categories reached and this one isn't already selected
                    const isDisabled = isMaxCategoriesReached && !isSelected;
                    
                    return (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Only add if we haven't reached the maximum
                              if (!isMaxCategoriesReached) {
                                field.onChange([...(field.value || []), category.id]);
                              }
                            } else {
                              field.onChange(
                                field.value?.filter((value) => value !== category.id) || []
                              );
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`category-${category.id}`}
                          className={`flex items-center ${isDisabled ? 'text-muted-foreground' : ''}`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: category.color || '#888' }}
                          />
                          {category.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {field.value && field.value.length >= 3 && (
                  <p className="text-xs text-muted-foreground mt-2">Maximum of 3 categories reached</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <FormField
            control={form.control}
            name="expense_date"
            render={({ field }) => {
              const [dateValue, setDateValue] = useState<string>(
                field.value ? format(field.value, 'yyyy-MM-dd') : ''
              );

              const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                setDateValue(value);
                if (value) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    field.onChange(date);
                  }
                }
              };

              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateValue}
                      onChange={handleDateChange}
                      className="w-full"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="px-3"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDateValue(date ? format(date, 'yyyy-MM-dd') : '');
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Location</Label>
              <div className="flex space-x-2">
                {!locationEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearLocation}
                    disabled={isSubmitting}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Location
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Input
                type="text"
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                placeholder="Search for a location"
                className="w-full"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={searchLocation}
                disabled={isSubmitting || isSearchingLocation}
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              {locationSearchResults.length > 0 && (
                <div className="rounded-md border p-4 space-y-4">
                  {locationSearchResults.map((location) => (
                    <Button
                      key={location.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectLocation(location)}
                      disabled={isSubmitting}
                    >
                      {location.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {locationEnabled && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>Location data will be saved with this expense.</p>
                <input type="hidden" {...form.register("latitude")} />
                <input type="hidden" {...form.register("longitude")} />
              </div>
            )}
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label className="text-base font-medium">Additional Options</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt_image">Receipt Image</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="receipt_image"
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="w-full justify-start"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {receiptPreview ? "Change Receipt" : "Upload Receipt"}
                  </Button>
                  {receiptPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setReceiptPreview(null);
                        form.setValue("receipt_image", null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {receiptPreview && (
                  <div className="mt-2 relative aspect-video w-full max-w-sm overflow-hidden rounded-md border">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Warranty Expiry */}
              <FormField
                control={form.control}
                name="warranty_expiration_date"
                render={({ field }) => {
                  const [dateValue, setDateValue] = useState<string>(
                    field.value ? format(field.value, 'yyyy-MM-dd') : ''
                  );

                  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    setDateValue(value);
                    if (value) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        field.onChange(date);
                      }
                    } else {
                      field.onChange(null);
                    }
                  };

                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Warranty Expiry</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={dateValue}
                          onChange={handleDateChange}
                          className="w-full"
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="px-3"
                              type="button"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={(date) => {
                                field.onChange(date || null);
                                setDateValue(date ? format(date, 'yyyy-MM-dd') : '');
                              }}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurrence</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence pattern" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (One-time)</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often this expense recurs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_impulse"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Impulse Purchase</FormLabel>
                    <FormDescription>
                      This was an unplanned purchase
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Split Expense */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split Expense</Label>
              <Switch
                checked={showSplitOptions}
                onCheckedChange={toggleSplitOptions}
                disabled={isSubmitting}
              />
            </div>

            {showSplitOptions && (
              <div className="rounded-md border p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Split Expense Details</h3>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      // Calculate 50/50 split based on current amount
                      const totalAmount = form.getValues('amount');
                      if (totalAmount && !isNaN(Number(totalAmount))) {
                        const halfAmount = (Number(totalAmount) / 2).toFixed(2);
                        form.setValue('split_amount', parseFloat(halfAmount));
                      }
                    }}
                  >
                    50/50 Split
                  </Button>
                </div>
                
                <FormField
                  control={form.control}
                  name="split_with_user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Split With <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter name of person"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the name of the person you're splitting this expense with
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="split_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Their Share (Amount They Owe) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            value={field.value === null || field.value === undefined ? "" : field.value}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Amount the other person owes you for this expense
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="split_note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Split Note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any details about this split..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                  <p>This will create a record of the split expense and help you track who owes what.</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details about this expense..."
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/expenses")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{isEditing ? "Update Expense" : "Create Expense"}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}