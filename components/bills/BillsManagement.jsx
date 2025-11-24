import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useToast,
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
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon, CheckIcon } from '@chakra-ui/icons';
import BillPayment from './BillPayment';

const BillsManagement = () => {
  const [bills, setBills] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_date: '',
    payment_status: 'unpaid',
    biller_id: '',
  });
  const [billers, setBillers] = useState([]);
  const toast = useToast();

  useEffect(() => {
    fetchBills();
    fetchBillers();
  }, []);

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('user_bills')
        .select(`
          *,
          billers (
            name,
            category
          ),
          payment_schedule (
            status,
            scheduled_date
          )
        `)
        .order('next_payment_date', { ascending: true });

      if (error) throw error;
      setBills(data);
    } catch (error) {
      toast({
        title: 'Error fetching bills',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const fetchBillers = async () => {
    try {
      const { data, error } = await supabase
        .from('billers')
        .select('*')
        .order('name');

      if (error) throw error;
      setBillers(data);
    } catch (error) {
      toast({
        title: 'Error fetching billers',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBill) {
        // Update existing bill
        const { error } = await supabase
          .from('user_bills')
          .update({
            name: formData.name,
            amount: formData.amount,
            next_payment_date: formData.due_date,
            biller_id: formData.biller_id,
          })
          .eq('id', selectedBill.id);

        if (error) throw error;

        toast({
          title: 'Bill updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        // Create new bill
        const { error } = await supabase.from('user_bills').insert([
          {
            name: formData.name,
            amount: formData.amount,
            next_payment_date: formData.due_date,
            biller_id: formData.biller_id,
            type: 'subscription',
            billing_frequency: 'monthly',
          },
        ]);

        if (error) throw error;

        toast({
          title: 'Bill created successfully',
          status: 'success',
          duration: 3000,
        });
      }

      setIsModalOpen(false);
      fetchBills();
      resetForm();
    } catch (error) {
      toast({
        title: 'Error saving bill',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('user_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Bill deleted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchBills();
    } catch (error) {
      toast({
        title: 'Error deleting bill',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleEdit = (bill) => {
    setSelectedBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount,
      due_date: bill.next_payment_date,
      biller_id: bill.biller_id,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSelectedBill(null);
    setFormData({
      name: '',
      amount: '',
      due_date: '',
      payment_status: 'unpaid',
      biller_id: '',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'green',
      'partially_paid': 'yellow',
      unpaid: 'red',
      pending: 'orange',
      overdue: 'red',
    };
    return colors[status] || 'gray';
  };

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" mb={4}>
        <h2>Bills Management</h2>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          Add New Bill
        </Button>
      </Box>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Amount</Th>
            <Th>Due Date</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {bills.map((bill) => (
            <Tr key={bill.id}>
              <Td>{bill.name}</Td>
              <Td>{bill.billers?.category}</Td>
              <Td>${bill.amount}</Td>
              <Td>{new Date(bill.next_payment_date).toLocaleDateString()}</Td>
              <Td>
                <Badge colorScheme={getStatusColor(bill.payment_schedule?.[0]?.status || 'unpaid')}>
                  {bill.payment_schedule?.[0]?.status || 'unpaid'}
                </Badge>
              </Td>
              <Td>
                <IconButton
                  icon={<CheckIcon />}
                  aria-label="Record Payment"
                  colorScheme="green"
                  mr={2}
                  onClick={() => {
                    setSelectedBillForPayment(bill);
                    setIsPaymentModalOpen(true);
                  }}
                />
                <IconButton
                  icon={<EditIcon />}
                  aria-label="Edit"
                  mr={2}
                  onClick={() => handleEdit(bill)}
                />
                <IconButton
                  icon={<DeleteIcon />}
                  aria-label="Delete"
                  colorScheme="red"
                  onClick={() => handleDelete(bill.id)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedBill ? 'Edit Bill' : 'Add New Bill'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <form onSubmit={handleSubmit}>
              <FormControl mb={4}>
                <FormLabel>Bill Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Biller</FormLabel>
                <Select
                  value={formData.biller_id}
                  onChange={(e) => setFormData({ ...formData, biller_id: e.target.value })}
                  required
                >
                  <option value="">Select a biller</option>
                  {billers.map((biller) => (
                    <option key={biller.id} value={biller.id}>
                      {biller.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Amount</FormLabel>
                <NumberInput min={0}>
                  <NumberInputField
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </NumberInput>
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Due Date</FormLabel>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </FormControl>

              <Button type="submit" colorScheme="blue" mr={3}>
                {selectedBill ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <BillPayment
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={selectedBillForPayment}
        onPaymentComplete={fetchBills}
      />
    </Box>
  );
};

export default BillsManagement;
