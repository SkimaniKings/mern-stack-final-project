import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  NumberInput,
  NumberInputField,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { supabase } from '../../utils/supabaseClient';

const BillPayment = ({ isOpen, onClose, bill, onPaymentComplete }) => {
  const [formData, setFormData] = useState({
    amount_paid: bill?.amount || '',
    payment_method: '',
    notes: '',
  });
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // First, create or update payment schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('payment_schedule')
        .upsert([
          {
            user_bill_id: bill.id,
            scheduled_date: bill.next_payment_date,
            status: formData.amount_paid >= bill.amount ? 'paid' : 'partially_paid',
            actual_payment_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Then create payment record
      const { error: paymentError } = await supabase.from('bill_payments').insert([
        {
          user_bill_id: bill.id,
          payment_schedule_id: scheduleData.id,
          amount_paid: formData.amount_paid,
          payment_method: formData.payment_method,
          payment_status: 'completed',
          notes: formData.notes,
        },
      ]);

      if (paymentError) throw paymentError;

      toast({
        title: 'Payment recorded successfully',
        status: 'success',
        duration: 3000,
      });

      onPaymentComplete();
      onClose();
    } catch (error) {
      toast({
        title: 'Error recording payment',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Record Payment for {bill?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Amount to Pay</FormLabel>
                <NumberInput min={0} max={bill?.amount}>
                  <NumberInputField
                    value={formData.amount_paid}
                    onChange={(e) =>
                      setFormData({ ...formData, amount_paid: e.target.value })
                    }
                    required
                  />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Payment Method</FormLabel>
                <Select
                  value={formData.payment_method}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any payment notes here"
                />
              </FormControl>

              <Button type="submit" colorScheme="blue" width="100%">
                Record Payment
              </Button>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BillPayment;
