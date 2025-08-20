import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, Car, CreditCard, MapPin, Clock, Phone, Mail, 
  Plane, AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2,
  BarChart3, TrendingUp, DollarSign, Users, Filter, Search,
  Eye, Edit, Download, ArrowUpDown, MoreHorizontal, Star,
  Shield, Wifi, Camera, Navigation, Home, Settings
} from 'lucide-react';
import './adminbookingdetail.css';

const AdminBookingDetail = () => {
  // API Configuration
  const API_BASE_URL = "https://parksy-backend.onrender.com";

  // State Management
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [stats, setStats] = useState({
    total_bookings: 0,
    confirmed_bookings: 0,
    cancelled_bookings: 0,
    total_revenue: 0,
    average_booking_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'cancel', 'delete'
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Airport mapping for better display
  const airportNames = {
    'LHR': 'London Heathrow',
    'LGW': 'London Gatwick', 
    'STN': 'London Stansted',
    'LTN': 'London Luton',
    'MAN': 'Manchester',
    'BHX': 'Birmingham',
    'EDI': 'Edinburgh',
    'GLA': 'Glasgow'
  };

  // Fetch all bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/parking/bookings`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data);
        setFilteredBookings(data.data);
        console.log('✅ Bookings loaded:', data.count);
      } else {
        throw new Error(data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setError(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parking/booking-stats`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
          console.log('✅ Stats loaded:', data.stats);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId, reason) => {
    try {
      setProcessingAction(true);
      const response = await fetch(`${API_BASE_URL}/api/parking/admin/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Admin cancellation' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Cancellation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'cancelled' }
              : booking
          )
        );
        
        // Refresh data
        await fetchBookings();
        await fetchStats();
        
        setShowModal(false);
        setSelectedBooking(null);
        setActionReason('');
        
        alert('Booking cancelled successfully!');
      } else {
        throw new Error(result.message || 'Cancellation failed');
      }
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete booking
  const deleteBooking = async (bookingId, reason) => {
    try {
      setProcessingAction(true);
      const response = await fetch(`${API_BASE_URL}/api/parking/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Admin deletion' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deletion failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setBookings(prevBookings => 
          prevBookings.filter(booking => booking.id !== bookingId)
        );
        
        // Refresh data
        await fetchBookings();
        await fetchStats();
        
        setShowModal(false);
        setSelectedBooking(null);
        setActionReason('');
        
        alert('Booking deleted successfully!');
      } else {
        throw new Error(result.message || 'Deletion failed');
      }
    } catch (error) {
      console.error('❌ Error deleting booking:', error);
      alert(`Failed to delete booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter and search bookings
  useEffect(() => {
    let filtered = [...bookings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.our_reference?.toLowerCase().includes(query) ||
        booking.magr_reference?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query) ||
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.car_registration_number?.toLowerCase().includes(query) ||
        booking.product_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle dates
      if (sortBy === 'created_at' || sortBy === 'dropoff_date' || sortBy === 'pickup_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle numbers
      if (sortBy === 'booking_amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredBookings(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [bookings, searchQuery, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  // Load data on component mount
  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const statusClasses = {
      'confirmed': 'admin-status-badge admin-confirmed',
      'cancelled': 'admin-status-badge admin-cancelled',
      'pending': 'admin-status-badge admin-pending',
      'refunded': 'admin-status-badge admin-refunded',
      'payment_failed': 'admin-status-badge admin-failed'
    };
    return statusClasses[status] || 'admin-status-badge admin-unknown';
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus) => {
    const statusClasses = {
      'paid': 'admin-payment-badge admin-paid',
      'refunded': 'admin-payment-badge admin-refunded',
      'failed': 'admin-payment-badge admin-failed',
      'pending': 'admin-payment-badge admin-pending',
      'partially_refunded': 'admin-payment-badge admin-partial'
    };
    return statusClasses[paymentStatus] || 'admin-payment-badge admin-unknown';
  };

  // Export bookings to CSV
  const exportToCSV = () => {
    const headers = [
      'Reference', 'MAGR Reference', 'Status', 'Customer Name', 'Email', 
      'Airport', 'Service', 'Amount', 'Payment Status', 'Drop-off Date',
      'Pick-up Date', 'Vehicle Registration', 'Created Date'
    ];

    const csvData = filteredBookings.map(booking => [
      booking.our_reference || '',
      booking.magr_reference || '',
      booking.status || '',
      booking.customer_name || '',
      booking.customer_email || '',
      airportNames[booking.airport_code] || booking.airport_code || '',
      booking.product_name || '',
      booking.booking_amount || '',
      booking.payment_status || '',
      booking.dropoff_date || '',
      booking.pickup_date || '',
      booking.car_registration_number || '',
      formatDate(booking.created_at)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parksy-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="admin-booking-dashboard">
        <div className="admin-loading-container">
          <RefreshCw className="admin-loading-spinner" size={48} />
          <h2>Loading Booking Dashboard...</h2>
          <p>Fetching booking data and statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-booking-dashboard">
        <div className="admin-error-container">
          <AlertCircle size={48} />
          <h2>Dashboard Error</h2>
          <p>{error}</p>
          <button className="admin-retry-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-booking-dashboard">
      {/* Header */}
      <div className="admin-dashboard-header">
        <div className="admin-header-content">
          <div className="admin-header-title">
            <h1>Parksy Admin Dashboard</h1>
            <p>Comprehensive booking management and analytics</p>
          </div>
          <div className="admin-header-actions">
            <button className="admin-refresh-btn" onClick={fetchBookings} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="admin-export-btn" onClick={exportToCSV}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card admin-total">
          <div className="admin-stat-icon">
            <BarChart3 size={24} />
          </div>
          <div className="admin-stat-content">
            <h3>Total Bookings</h3>
            <div className="admin-stat-number">{stats.total_bookings}</div>
            <div className="admin-stat-subtitle">All time bookings</div>
          </div>
        </div>

        <div className="admin-stat-card admin-confirmed">
          <div className="admin-stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="admin-stat-content">
            <h3>Confirmed</h3>
            <div className="admin-stat-number">{stats.confirmed_bookings}</div>
            <div className="admin-stat-subtitle">Active bookings</div>
          </div>
        </div>

        <div className="admin-stat-card admin-revenue">
          <div className="admin-stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="admin-stat-content">
            <h3>Total Revenue</h3>
            <div className="admin-stat-number">{formatCurrency(stats.total_revenue)}</div>
            <div className="admin-stat-subtitle">From confirmed bookings</div>
          </div>
        </div>

        <div className="admin-stat-card admin-average">
          <div className="admin-stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="admin-stat-content">
            <h3>Average Value</h3>
            <div className="admin-stat-number">{formatCurrency(stats.average_booking_value)}</div>
            <div className="admin-stat-subtitle">Per booking</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="admin-dashboard-controls">
        <div className="admin-search-section">
          <div className="admin-search-input-container">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search bookings by reference, email, name, or registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        <div className="admin-filter-section">
          <div className="admin-filter-group">
            <label>Status Filter</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Sort By</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="admin-filter-select"
            >
              <option value="created_at">Created Date</option>
              <option value="dropoff_date">Drop-off Date</option>
              <option value="booking_amount">Amount</option>
              <option value="customer_name">Customer Name</option>
              <option value="airport_code">Airport</option>
            </select>
          </div>

          <div className="admin-filter-group">
            <label>Order</label>
            <button 
              className="admin-sort-order-btn"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown size={16} />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        <div className="admin-results-info">
          <p>Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings</p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="admin-bookings-table-container">
        <table className="admin-bookings-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Airport</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Travel Dates</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.map((booking) => (
              <tr key={booking.id} className="admin-booking-row">
                <td>
                  <div className="admin-reference-cell">
                    <strong>{booking.our_reference}</strong>
                    {booking.magr_reference && (
                      <small>MAGR: {booking.magr_reference}</small>
                    )}
                  </div>
                </td>
                <td>
                  <div className="admin-customer-cell">
                    <strong>{booking.customer_name}</strong>
                    <small>{booking.customer_email}</small>
                    {booking.car_registration_number && (
                      <div className="admin-vehicle-info">
                        <Car size={12} />
                        {booking.car_registration_number}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="admin-service-cell">
                    <strong>{booking.product_name}</strong>
                    <small>Code: {booking.company_code}</small>
                  </div>
                </td>
                <td>
                  <div className="admin-airport-cell">
                    <Plane size={16} />
                    <span>{airportNames[booking.airport_code] || booking.airport_code}</span>
                  </div>
                </td>
                <td>
                  <div className="admin-amount-cell">
                    <strong>{formatCurrency(booking.booking_amount)}</strong>
                    <small>{booking.currency || 'GBP'}</small>
                  </div>
                </td>
                <td>
                  <span className={getStatusBadge(booking.status)}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  <span className={getPaymentStatusBadge(booking.payment_status)}>
                    {booking.payment_status || 'N/A'}
                  </span>
                </td>
                <td>
                  <div className="admin-dates-cell">
                    <div className="admin-date-row">
                      <small>Drop: {booking.dropoff_date} {booking.dropoff_time}</small>
                    </div>
                    <div className="admin-date-row">
                      <small>Pick: {booking.pickup_date} {booking.pickup_time}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <small>{formatDate(booking.created_at)}</small>
                </td>
                <td>
                  <div className="admin-action-buttons">
                    <button
                      className="admin-action-btn admin-view"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setModalType('view');
                        setShowModal(true);
                      }}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    {booking.status !== 'cancelled' && (
                      <button
                        className="admin-action-btn admin-cancel"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('cancel');
                          setShowModal(true);
                        }}
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    <button
                      className="admin-action-btn admin-delete"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setModalType('delete');
                        setShowModal(true);
                      }}
                      title="Delete Booking"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedBookings.length === 0 && (
          <div className="admin-no-results">
            <AlertCircle size={48} />
            <h3>No Bookings Found</h3>
            <p>No bookings match your current filters. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button 
            className="admin-pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="admin-pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <button 
            className="admin-pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedBooking && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'delete' && 'Delete Booking'}
              </h2>
              <button 
                className="admin-modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              {modalType === 'view' ? (
                <div className="admin-booking-details">
                  {/* Booking Information */}
                  <div className="admin-detail-section">
                    <h3>Booking Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Our Reference</label>
                        <span>{selectedBooking.our_reference}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>MAGR Reference</label>
                        <span>{selectedBooking.magr_reference || 'N/A'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Status</label>
                        <span className={getStatusBadge(selectedBooking.status)}>
                          {selectedBooking.status}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Created</label>
                        <span>{formatDate(selectedBooking.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="admin-detail-section">
                    <h3>Customer Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Name</label>
                        <span>{selectedBooking.customer_name}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Email</label>
                        <span>{selectedBooking.customer_email}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>User Account</label>
                        <span>{selectedBooking.user_email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div className="admin-detail-section">
                    <h3>Service Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Service</label>
                        <span>{selectedBooking.product_name}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Airport</label>
                        <span>{airportNames[selectedBooking.airport_code] || selectedBooking.airport_code}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Company Code</label>
                        <span>{selectedBooking.company_code}</span>
                      </div>
                    </div>
                  </div>

                  {/* Travel Information */}
                  <div className="admin-detail-section">
                    <h3>Travel Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Drop-off</label>
                        <span>{selectedBooking.dropoff_date} at {selectedBooking.dropoff_time}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Pick-up</label>
                        <span>{selectedBooking.pickup_date} at {selectedBooking.pickup_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="admin-detail-section">
                    <h3>Vehicle Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Registration</label>
                        <span>{selectedBooking.car_registration_number || 'N/A'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Make & Model</label>
                        <span>{selectedBooking.car_make} {selectedBooking.car_model}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="admin-detail-section">
                    <h3>Payment Information</h3>
                    <div className="admin-detail-grid">
                      <div className="admin-detail-item">
                        <label>Amount</label>
                        <span>{formatCurrency(selectedBooking.booking_amount)}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Payment Method</label>
                        <span>{selectedBooking.payment_method || 'N/A'}</span>
                      </div>
                      <div className="admin-detail-item">
                        <label>Payment Status</label>
                        <span className={getPaymentStatusBadge(selectedBooking.payment_status)}>
                          {selectedBooking.payment_status || 'N/A'}
                        </span>
                      </div>
                      {selectedBooking.stripe_payment_intent_id && (
                        <div className="admin-detail-item">
                          <label>Stripe Payment ID</label>
                          <span className="admin-payment-id">{selectedBooking.stripe_payment_intent_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="admin-action-form">
                  <div className="admin-warning-message">
                    <AlertCircle size={24} />
                    <div>
                      <h4>
                        {modalType === 'cancel' ? 'Cancel Booking' : 'Delete Booking'}
                      </h4>
                      <p>
                        {modalType === 'cancel' 
                          ? 'This will cancel the booking and process any necessary refunds.'
                          : 'This action is permanent and cannot be undone. The booking will be completely removed from the system.'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Reason (Optional)</label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder={`Enter reason for ${modalType === 'cancel' ? 'cancellation' : 'deletion'}...`}
                      rows={3}
                      className="admin-reason-textarea"
                    />
                  </div>

                  <div className="admin-modal-actions">
                    <button 
                      className="admin-btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={processingAction}
                    >
                      Cancel
                    </button>
                    <button 
                      className={`admin-btn-primary ${modalType === 'delete' ? 'admin-btn-danger' : 'admin-btn-warning'}`}
                      onClick={() => {
                        if (modalType === 'cancel') {
                          cancelBooking(selectedBooking.id, actionReason);
                        } else {
                          deleteBooking(selectedBooking.id, actionReason);
                        }
                      }}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <RefreshCw className="admin-spinning" size={16} />
                          Processing...
                        </>
                      ) : (
                        <>
                          {modalType === 'cancel' ? <XCircle size={16} /> : <Trash2 size={16} />}
                          {modalType === 'cancel' ? 'Cancel Booking' : 'Delete Booking'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingDetail;