// pages/Orders.jsx
import React, { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { API_BASE } from '../config/api';
import {
  Box, Typography, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel,
  FormControl, Snackbar, Stack, CircularProgress
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from "@mui/icons-material";
import axios from "axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [form, setForm] = useState({ supplier_id: "", order_date: "", order_status: "Pending", total_amount: "" });
  const [snackbar, setSnackbar] = useState({ open: false, msg: "" });
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/suppliers`);
      setSuppliers(res.data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchSuppliers()]);
      setLoading(false);
    };
    
    fetchData();
  }, []);

  const handleOpen = (order) => {
    if (order) {
      setEditOrder(order.order_id);
      setForm(order);
    } else {
      setEditOrder(null);
      setForm({ supplier_id: "", order_date: "", order_status: "Pending", total_amount: "" });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      if (editOrder) {
        await axios.put(`${API_BASE}/api/orders/${editOrder}`, form);
        setSnackbar({ open: true, msg: "Order updated!" });
      } else {
        await axios.post(`${API_BASE}/api/orders`, form);
        setSnackbar({ open: true, msg: "Order added!" });
      }
      fetchOrders();
      handleClose();
    } catch (err) {
      alert("Error saving order");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this order?")) {
      await axios.delete(`${API_BASE}/api/orders/${id}`);
      fetchOrders();
      setSnackbar({ open: true, msg: "Order deleted!" });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <SidebarLayout>
        <Box p={3} display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
          <Typography variant="h6" color="text.secondary" sx={{ ml: 2 }}>
            Loading orders...
          </Typography>
        </Box>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">Orders</Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => handleOpen()}>Add Order</Button>
        </Box>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.order_id}>
                    <TableCell>{o.supplier_name}</TableCell>
                    <TableCell>{new Date(o.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{o.order_status}</TableCell>
                    <TableCell>{o.total_amount}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpen(o)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(o.order_id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>
            {editOrder ? "Edit Order" : "Add Order"}
            <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel>Supplier</InputLabel>
                <Select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                  {suppliers.map((s) => (
                    <MenuItem key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField type="date" name="order_date" value={form.order_date} onChange={handleChange} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="order_status" value={form.order_status} onChange={handleChange}>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Total Amount" name="total_amount" type="number" value={form.total_amount} onChange={handleChange} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.msg} />
      </Box>
    </SidebarLayout>
  );
}