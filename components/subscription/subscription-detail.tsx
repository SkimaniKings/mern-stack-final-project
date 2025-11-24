'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionCategory,
  SubscriptionCategoryInfo,
  SubscriptionUsageLog,
  SubscriptionPriceChange,
} from '@/types/subscription';
import { deleteSubscription, logSubscriptionUsage } from '@/app/actions/subscription';
import { formatCurrency } from '@/lib/utils';
import { formatFrequency, getUsageRatingColorClass } from '@/lib/subscription-utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

interface SubscriptionDetailProps {
  subscription: Subscription;
  category?: SubscriptionCategoryInfo | null;
  usageLogs: SubscriptionUsageLog[];
  priceChanges: SubscriptionPriceChange[];
}

export default function SubscriptionDetail({
  subscription,
  category,
  usageLogs,
  priceChanges,
}: SubscriptionDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingUsage, setIsLoggingUsage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'semi_annual': return 'Semi-Annual';
      case 'annual': return 'Annual';
      default: return frequency;
    }
  };
  
  // Calculate annual cost
  const calculateAnnualCost = () => {
    const { amount, frequency } = subscription;
    switch (frequency) {
      case 'weekly': return amount * 52;
      case 'bi_weekly': return amount * 26;
      case 'monthly': return amount * 12;
      case 'quarterly': return amount * 4;
      case 'semi_annual': return amount * 2;
      case 'annual': return amount;
      default: return amount * 12; // Default to monthly if frequency is unknown
    }
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string | undefined): "success" | "destructive" | "secondary" | "default" | "outline" => {
    if (!status) return 'secondary';
    
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  
  // Use the utility function for color coding
  const getUsageRatingColor = (rating: number | null | undefined) => {
    // Get the CSS class from our utility function
    return getUsageRatingColorClass(rating);
  };
  
  // Check if renewal date is approaching (within 7 days)
  const isRenewalSoon = () => {
    // Check if next_renewal_date exists in the subscription object
    if (!subscription.next_renewal_date) {
      // Calculate next renewal date based on start_date and recurrence
      return false; // Default to false if we can't determine
    }
    
    try {
      const today = new Date();
      const renewal = parseISO(subscription.next_renewal_date);
      const diffTime = renewal.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    } catch (error) {
      console.error('Error calculating renewal date:', error);
      return false;
    }
  };
  
  // Handle delete subscription
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteSubscription(subscription.id);
      router.push('/subscriptions');
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Handle log usage
  const handleLogUsage = async () => {
    try {
      setIsLoggingUsage(true);
      await logSubscriptionUsage(subscription.id, new Date().toISOString().split('T')[0]);
      router.refresh();
    } catch (error) {
      console.error('Failed to log subscription usage:', error);
    } finally {
      setIsLoggingUsage(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/subscriptions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{subscription.name}</h1>
        {isRenewalSoon() && (
          <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <AlertCircle className="h-3 w-3" />
            Renews Soon
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className={getUsageRatingColor(subscription.usage_rating)}>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                {subscription.vendor ? `Provider: ${subscription.vendor}` : 'No vendor specified'}
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">
                  {category?.name || 'Uncategorized'}
                </Badge>
                {subscription.status && (
                  <Badge variant={getStatusBadgeVariant(subscription.status)}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Badge>
                )}                
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Frequency</p>
                    <p>{formatFrequency(subscription.frequency || subscription.recurrence)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Renewal Date</p>
                    <p>{subscription.next_renewal_date ? format(parseISO(subscription.next_renewal_date), 'MMMM d, yyyy') : 'Not set'}</p>
                  </div>
                  {subscription.last_renewed_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Last Renewed</p>
                      <p>{format(parseISO(subscription.last_renewed_at), 'MMMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Cost</p>
                    <p className="font-medium">
                      {formatCurrency(calculateAnnualCost(), subscription.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto Renew</p>
                    <p>{subscription.auto_renew ? 'Yes' : 'No'}</p>
                  </div>
                  {subscription.usage_rating !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Usage Rating</p>
                      <p>{subscription.usage_rating}/10</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p>{format(parseISO(subscription.created_at), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
              
              {(subscription.description || subscription.notes) && (
                <div className="mt-6 space-y-4">
                  {subscription.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{subscription.description}</p>
                    </div>
                  )}
                  {subscription.notes && (
                    <div>
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-muted-foreground">{subscription.notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {(subscription.cancel_url || subscription.support_contact) && (
                <div className="mt-6 space-y-2">
                  {subscription.cancel_url && (
                    <div>
                      <p className="text-sm font-medium">Cancellation URL</p>
                      <a 
                        href={subscription.cancel_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {subscription.cancel_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {subscription.support_contact && (
                    <div>
                      <p className="text-sm font-medium">Support Contact</p>
                      <p className="text-sm text-muted-foreground">{subscription.support_contact}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <Tabs defaultValue="usage">
              <TabsList>
                <TabsTrigger value="usage">Usage History</TabsTrigger>
                <TabsTrigger value="price">Price Changes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="usage">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage History</CardTitle>
                    <CardDescription>
                      Track when you've used this subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {usageLogs.length === 0 ? (
                      <p className="text-muted-foreground">No usage history recorded yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usageLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {format(parseISO(log.used_on), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>{log.note || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="price">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Change History</CardTitle>
                    <CardDescription>
                      Track price changes over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {priceChanges.length === 0 ? (
                      <p className="text-muted-foreground">No price changes recorded yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Old Price</TableHead>
                            <TableHead>New Price</TableHead>
                            <TableHead>Change</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceChanges.map((change) => {
                            const priceDiff = change.new_amount - change.old_amount;
                            const percentChange = (priceDiff / change.old_amount) * 100;
                            
                            return (
                              <TableRow key={change.id}>
                                <TableCell>
                                  {format(parseISO(change.changed_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(change.old_amount, subscription.currency)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(change.new_amount, subscription.currency)}
                                </TableCell>
                                <TableCell>
                                  <span className={priceDiff > 0 ? 'text-red-500' : 'text-green-500'}>
                                    {priceDiff > 0 ? '+' : ''}
                                    {formatCurrency(priceDiff, subscription.currency)} 
                                    ({priceDiff > 0 ? '+' : ''}
                                    {percentChange.toFixed(2)}%)
                                  </span>
                                </TableCell>
                                <TableCell>{change.reason || '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => router.push(`/subscriptions/${subscription.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Subscription
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleLogUsage}
                disabled={isLoggingUsage}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Log Usage Today
              </Button>
              
              {subscription.cancel_url && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  asChild
                >
                  <a 
                    href={subscription.cancel_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to Cancel Page
                  </a>
                </Button>
              )}
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your
                      subscription and all associated data.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
