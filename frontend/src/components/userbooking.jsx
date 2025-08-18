import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Car, CreditCard, Edit3, Trash2, X, Eye, Phone, Mail, User, Hash, Plane, Clock4, RefreshCw, AlertCircle, CheckCircle, XCircle, DollarSign } from 'lucide-react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Backend URL configuration
  const API_BASE_URL = 'https://parksy-backend.onrender.com';

  // Fetch user bookings
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to view your bookings');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/my-bookings`, {
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
        setBookings(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to load bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed booking information
  const fetchBookingDetails = async (reference) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to view booking details');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/bookings/${reference}`, {
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

  // Refresh bookings
  const refreshBookings = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please log in to cancel booking');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/bookings/${selectedBooking.our_reference}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        alert('Booking cancelled successfully' + (data.refund ? `. Refund of £${data.refund.amount} has been processed.` : ''));
        setShowCancelModal(false);
        setCancelReason('');
        setShowDetailsModal(false);
        await fetchBookings(); // Refresh the list
      } else {
        throw new Error(data.message || 'Cancellation failed');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format date and time
  const formatDateTime = (dateString, timeString = null) => {
    if (!dateString) return { date: 'N/A', time: '' };
    
    try {
      const date = new Date(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      
      return {
        date: date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        time: timeString ? date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        }) : ''
      };
    } catch (error) {
      return { date: dateString, time: timeString || '' };
    }
  };

  // Calculate duration
  const calculateDuration = (startDate, startTime, endDate, endTime) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (startTime) {
        const [startHours, startMinutes] = startTime.split(':');
        start.setHours(parseInt(startHours), parseInt(startMinutes));
      }
      if (endTime) {
        const [endHours, endMinutes] = endTime.split(':');
        end.setHours(parseInt(endHours), parseInt(endMinutes));
      }

      const diffMs = end - start;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h`;
      } else if (diffHours > 0) {
        return `${diffHours}h`;
      } else {
        return 'Same day';
      }
    } catch (error) {
      return 'N/A';
    }
  };

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: <CheckCircle size={16} />,
          text: 'Confirmed' 
        };
      case 'cancelled':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: <XCircle size={16} />,
          text: 'Cancelled' 
        };
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: <Clock4 size={16} />,
          text: 'Pending' 
        };
      case 'completed':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: <CheckCircle size={16} />,
          text: 'Completed' 
        };
      case 'refunded':
        return { 
          color: 'bg-purple-100 text-purple-800 border-purple-200', 
          icon: <DollarSign size={16} />,
          text: 'Refunded' 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <AlertCircle size={16} />,
          text: status || 'Unknown' 
        };
    }
  };

  // Get payment status display
  const getPaymentStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { color: 'text-green-600', icon: <CheckCircle size={14} />, text: 'Paid' };
      case 'refunded':
        return { color: 'text-purple-600', icon: <DollarSign size={14} />, text: 'Refunded' };
      case 'partially_refunded':
        return { color: 'text-orange-600', icon: <DollarSign size={14} />, text: 'Partially Refunded' };
      case 'pending':
        return { color: 'text-yellow-600', icon: <Clock4 size={14} />, text: 'Pending' };
      case 'failed':
        return { color: 'text-red-600', icon: <XCircle size={14} />, text: 'Failed' };
      default:
        return { color: 'text-gray-600', icon: <AlertCircle size={14} />, text: status || 'Unknown' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600 mt-2">Manage and view all your parking bookings</p>
            </div>
            <button
              onClick={refreshBookings}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
            <button 
              onClick={fetchBookings}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Car size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600 mb-6">You haven't made any parking bookings yet.</p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Book Parking Now
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => {
              const statusDisplay = getStatusDisplay(booking.status);
              const paymentDisplay = getPaymentStatusDisplay(booking.payment_status);
              const dropoffDateTime = formatDateTime(booking.dropoff_date, booking.dropoff_time);
              const pickupDateTime = formatDateTime(booking.pickup_date, booking.pickup_time);
              const duration = calculateDuration(booking.dropoff_date, booking.dropoff_time, booking.pickup_date, booking.pickup_time);

              return (
                <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Booking Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.airport_code} - {booking.product_name || 'Airport Parking'}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusDisplay.color}`}>
                            {statusDisplay.icon}
                            {statusDisplay.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Hash size={14} />
                            {booking.our_reference}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {booking.customer_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          £{booking.booking_amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${paymentDisplay.color}`}>
                          {paymentDisplay.icon}
                          {paymentDisplay.text}
                        </div>
                      </div>
                    </div>

                    {/* Travel Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                          <Plane size={16} />
                          Drop-off
                        </h4>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} />
                          <span>{dropoffDateTime.date}</span>
                        </div>
                        {dropoffDateTime.time && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock size={14} />
                            <span>{dropoffDateTime.time}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                          <Plane size={16} className="rotate-180" />
                          Pick-up
                        </h4>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} />
                          <span>{pickupDateTime.date}</span>
                        </div>
                        {pickupDateTime.time && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock size={14} />
                            <span>{pickupDateTime.time}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vehicle & Duration */}
                    <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Car size={16} className="text-gray-500" />
                        <span className="text-gray-700">
                          {booking.vehicle_registration} - {booking.customer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock4 size={14} />
                        <span>{duration}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => fetchBookingDetails(booking.our_reference)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                      
                      {booking.can_cancel && (
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowCancelModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      )}
                      
                      {booking.can_edit && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                          <Edit3 size={16} />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Booking Details Modal */}
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Booking References */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Booking References</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Our Reference:</span>
                        <span className="font-medium">{selectedBooking.our_reference}</span>
                      </div>
                      {selectedBooking.magr_reference && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Provider Reference:</span>
                          <span className="font-medium">{selectedBooking.magr_reference}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${getStatusDisplay(selectedBooking.status).color.includes('green') ? 'text-green-600' : 
                          selectedBooking.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {selectedBooking.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">£{selectedBooking.booking_amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium">{selectedBooking.payment_method || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Status:</span>
                        <span className={`font-medium ${getPaymentStatusDisplay(selectedBooking.payment_status).color}`}>
                          {selectedBooking.payment_status || 'N/A'}
                        </span>
                      </div>
                      {selectedBooking.refund_amount && selectedBooking.refund_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Refunded:</span>
                          <span className="font-medium text-purple-600">£{selectedBooking.refund_amount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span>{selectedBooking.customer_name}</span>
                    </div>
                    {selectedBooking.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <span>{selectedBooking.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Travel Information */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Travel Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Drop-off Details</h4>
                      <div className="space-y-1 text-sm">
                        <div>Date: {formatDateTime(selectedBooking.dropoff_date).date}</div>
                        {selectedBooking.dropoff_time && (
                          <div>Time: {selectedBooking.dropoff_time}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Pick-up Details</h4>
                      <div className="space-y-1 text-sm">
                        <div>Date: {formatDateTime(selectedBooking.pickup_date).date}</div>
                        {selectedBooking.pickup_time && (
                          <div>Time: {selectedBooking.pickup_time}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Vehicle Information</h3>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Car size={20} className="text-gray-500" />
                    <span className="font-medium">{selectedBooking.vehicle_registration}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedBooking.can_cancel && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowCancelModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X size={16} />
                      Cancel Booking
                    </button>
                  )}
                  
                  {selectedBooking.can_edit && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      <Edit3 size={16} />
                      Edit Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel booking {selectedBooking.our_reference}?
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation reason:
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Please provide a reason for cancellation..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={actionLoading}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={actionLoading || !cancelReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;