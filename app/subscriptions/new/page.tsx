import { Metadata } from 'next';
import NewSubscriptionClient from './new-client';
import { createSubscriptionAction } from './actions';

export const metadata: Metadata = {
  title: 'Add Subscription | Dripcheck',
  description: 'Add a new subscription to track',
};

export default function NewSubscriptionPage() {
  return <NewSubscriptionClient serverAction={createSubscriptionAction} />;
}
