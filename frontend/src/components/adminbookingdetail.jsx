import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Eye, Trash2, Edit3, RefreshCw, Calendar, 
  Clock, MapPin, Car, CreditCard, User, Mail, Phone, Hash, Plane, 
  DollarSign, TrendingUp, Users, ShoppingBag, AlertTriangle, 
  CheckCircle, XCircle, Clock4, MoreVertical, FileText, Ban,
  ArrowUpDown, ChevronLeft, ChevronRight, Settings, BarChart3
} from 'lucide-react';

const AdminBookingsDashboard = () => {
  // State Management
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingsPerPage] = useState(20);

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    cancelled: 0,
    pending: 0,
    totalRevenue: 0,
    totalRefunded: 0,
    netRevenue: 0,
    averageBooking: 0
  });

  // Backend URL configuration
  const API_BASE_URL = 'https://parksy-backend.onrender.com';

  // Fetch all bookings (admin endpoint)
  useEffect(() => {
    fetchAllBookings();
  }, []);

  // Filter bookings when search/filter changes
  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, paymentFilter, dateFilter, sortBy, sortOrder]);

  const fetchAllBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Admin authentication required');
        setLoading(false);
        return;
      }

      // Admin endpoint to get all bookings
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        const bookingsData = data.data || data.bookings || [];
        setBookings(bookingsData);
        calculateStats(bookingsData);
      } else {
        throw new Error(data.message || 'Failed to load bookings');
      }
    } catch (err) {
      console.error('Error fetching admin bookings:', err);
      setError(err.message || 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bookingsData) => {
    const stats = {
      total: bookingsData.length,
      confirmed: bookingsData.filter(b => b.status === 'confirmed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      pending: bookingsData.filter(b => b.status === 'pending').length,
      totalRevenue: bookingsData.reduce((sum, b) => sum + (b.booking_amount || 0), 0),
      totalRefunded: bookingsData.reduce((sum, b) => sum + (b.refund_amount || 0), 0),
      netRevenue: 0,
      averageBooking: 0
    };

    stats.netRevenue = stats.totalRevenue - stats.totalRefunded;
    stats.averageBooking = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

    setStats(stats);
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.our_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.magr_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.airport_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => booking.payment_status === paymentFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(booking => 
            new Date(booking.created_at) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(booking => 
            new Date(booking.created_at) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(booking => 
            new Date(booking.created_at) >= filterDate
          );
          break;
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'booking_amount' || sortBy === 'refund_amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortBy === 'created_at' || sortBy === 'dropoff_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredBookings(filtered);
    setCurrentPage(1);
  };

  const refreshBookings = async () => {
    setRefreshing(true);
    await fetchAllBookings();
    setRefreshing(false);
  };

  const fetchBookingDetails = async (reference) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Admin authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setSelectedBooking(data.data);
        setShowDetailsModal(true);
      } else {
        throw new Error(data.message || 'Failed to load booking details');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      alert('Failed to load booking details: ' + err.message);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Admin authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${selectedBooking.our_reference}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        alert('Booking deleted successfully');
        setShowDeleteModal(false);
        setShowDetailsModal(false);
        await fetchAllBookings();
      } else {
        throw new Error(data.message || 'Deletion failed');
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert('Failed to delete booking: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const exportBookings = () => {
    const csvContent = [
      ['Reference', 'Customer', 'Email', 'Airport', 'Status', 'Payment Status', 'Amount', 'Created', 'Vehicle'].join(','),
      ...filteredBookings.map(booking => [
        booking.our_reference,
        booking.customer_name,
        booking.customer_email,
        booking.airport_code,
        booking.status,
        booking.payment_status,
        booking.booking_amount,
        new Date(booking.created_at).toLocaleDateString(),
        booking.vehicle_registration
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `bookings-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} />, text: 'Confirmed' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle size={14} />, text: 'Cancelled' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Clock4 size={14} />, text: 'Pending' };
      case 'completed':
        return { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle size={14} />, text: 'Completed' };
      case 'refunded':
        return { color: 'bg-purple-100 text-purple-800', icon: <DollarSign size={14} />, text: 'Refunded' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle size={14} />, text: status || 'Unknown' };
    }
  };

  const getPaymentStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { color: 'text-green-600', icon: <CheckCircle size={14} /> };
      case 'refunded':
        return { color: 'text-purple-600', icon: <DollarSign size={14} /> };
      case 'failed':
        return { color: 'text-red-600', icon: <XCircle size={14} /> };
      default:
        return { color: 'text-gray-600', icon: <Clock4 size={14} /> };
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const startIndex = (currentPage - 1) * bookingsPerPage;
  const endIndex = startIndex + bookingsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Bookings Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage and monitor all parking bookings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportBookings}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={refreshBookings}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Confirmed</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-800">Cancelled</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{stats.cancelled}</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock4 size={16} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800">Revenue</span>
              </div>
              <div className="text-xl font-bold text-indigo-900">£{stats.totalRevenue.toFixed(0)}</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Refunded</span>
              </div>
              <div className="text-xl font-bold text-purple-900">£{stats.totalRefunded.toFixed(0)}</div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Net</span>
              </div>
              <div className="text-xl font-bold text-emerald-900">£{stats.netRevenue.toFixed(0)}</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Avg</span>
              </div>
              <div className="text-xl font-bold text-orange-900">£{stats.averageBooking.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="booking_amount-desc">Highest Amount</option>
                <option value="booking_amount-asc">Lowest Amount</option>
                <option value="dropoff_date-desc">Latest Travel</option>
                <option value="dropoff_date-asc">Earliest Travel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={20} />
              <p>{error}</p>
            </div>
            <button 
              onClick={fetchAllBookings}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Reference</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Airport</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Travel Date</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Payment</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Vehicle</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.map((booking, index) => {
                  const statusDisplay = getStatusDisplay(booking.status);
                  const paymentDisplay = getPaymentStatusDisplay(booking.payment_status);
                  
                  return (
                    <tr key={booking.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{booking.our_reference}</div>
                          <div className="text-sm text-gray-500">{booking.magr_reference}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{booking.customer_name}</div>
                          <div className="text-sm text-gray-500">{booking.customer_email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">{booking.airport_code}</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">{new Date(booking.dropoff_date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500">{booking.dropoff_time}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon}
                          {statusDisplay.text}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-1 ${paymentDisplay.color}`}>
                          {paymentDisplay.icon}
                          <span className="text-sm font-medium">{booking.payment_status || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">£{booking.booking_amount?.toFixed(2) || '0.00'}</div>
                          {booking.refund_amount > 0 && (
                            <div className="text-sm text-purple-600">-£{booking.refund_amount?.toFixed(2)}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{booking.vehicle_registration}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchBookingDetails(booking.our_reference)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Booking"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages) return null;
                      
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded transition-colors ${
                            page === currentPage 
                              ? 'bg-blue-600 text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking Details Modal */}
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Booking Details - {selectedBooking.our_reference}</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Basic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* References & Status */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">References & Status</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Our Reference</label>
                        <p className="font-mono text-lg">{selectedBooking.our_reference}</p>
                      </div>
                      {selectedBooking.magr_reference && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Provider Reference</label>
                          <p className="font-mono text-lg">{selectedBooking.magr_reference}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                          {(() => {
                            const statusDisplay = getStatusDisplay(selectedBooking.status);
                            return (
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color}`}>
                                {statusDisplay.icon}
                                {statusDisplay.text}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p>{new Date(selectedBooking.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">Customer Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          {selectedBooking.customer_name}
                        </p>
                      </div>
                      {selectedBooking.customer_email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            {selectedBooking.customer_email}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          {selectedBooking.phone_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">User ID</label>
                        <p className="font-mono text-sm">{selectedBooking.user_id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">Payment Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Amount</label>
                        <p className="text-2xl font-bold text-green-600">£{selectedBooking.booking_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Method</label>
                        <p className="flex items-center gap-2">
                          <CreditCard size={16} className="text-gray-400" />
                          {selectedBooking.payment_method || 'Stripe'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Status</label>
                        <div className="mt-1">
                          {(() => {
                            const paymentDisplay = getPaymentStatusDisplay(selectedBooking.payment_status);
                            return (
                              <div className={`flex items-center gap-1 ${paymentDisplay.color}`}>
                                {paymentDisplay.icon}
                                <span className="font-medium">{selectedBooking.payment_status}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {selectedBooking.stripe_payment_intent_id && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Stripe Payment ID</label>
                          <p className="font-mono text-sm break-all">{selectedBooking.stripe_payment_intent_id}</p>
                        </div>
                      )}
                      {selectedBooking.refund_amount && selectedBooking.refund_amount > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Refunded</label>
                          <p className="text-lg font-bold text-purple-600">£{selectedBooking.refund_amount?.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Travel Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">Travel Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Airport</label>
                        <p className="flex items-center gap-2">
                          <Plane size={16} className="text-gray-400" />
                          {selectedBooking.airport_code}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Service</label>
                        <p>{selectedBooking.product_name || selectedBooking.company_code}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Drop-off Date</label>
                        <p className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {new Date(selectedBooking.dropoff_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Drop-off Time</label>
                        <p className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          {selectedBooking.dropoff_time}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Pick-up Date</label>
                        <p className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {new Date(selectedBooking.pickup_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Pick-up Time</label>
                        <p className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400" />
                          {selectedBooking.pickup_time}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">Vehicle Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Registration</label>
                        <p className="flex items-center gap-2 font-mono text-lg">
                          <Car size={20} className="text-gray-400" />
                          {selectedBooking.vehicle_registration}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Make</label>
                          <p>{selectedBooking.car_make || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Model</label>
                          <p>{selectedBooking.car_model || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Color</label>
                          <p>{selectedBooking.car_color || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Passengers</label>
                          <p>{selectedBooking.passenger_count || 1}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flight Information */}
                {(selectedBooking.departure_flight_number || selectedBooking.arrival_flight_number) && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700 text-lg border-b border-gray-200 pb-2">Flight Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Departure Flight</label>
                        <p>{selectedBooking.departure_flight_number || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Departure Terminal</label>
                        <p>{selectedBooking.departure_terminal || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Arrival Flight</label>
                        <p>{selectedBooking.arrival_flight_number || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Arrival Terminal</label>
                        <p>{selectedBooking.arrival_terminal || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Administrative Actions */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-700 text-lg mb-4">Administrative Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Booking
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                      <Ban size={16} />
                      Force Cancel
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <DollarSign size={16} />
                      Process Refund
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <FileText size={16} />
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Booking</h3>
                </div>
                
                <p className="text-gray-600 mb-6">
                  Are you sure you want to permanently delete booking <strong>{selectedBooking.our_reference}</strong>? 
                  This action cannot be undone and will remove all associated data.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <div className="flex gap-2">
                    <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Warning:</p>
                      <p>This will not cancel the booking with the provider or process any refunds automatically.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedBooking(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteBooking}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? 'Deleting...' : 'Delete Booking'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBookings.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all' 
                ? 'No bookings match your current filters. Try adjusting your search criteria.'
                : 'No bookings have been made yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookingsDashboard;