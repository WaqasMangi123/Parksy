import React, { useState, useEffect } from 'react';
import { 
  Calendar, Car, Plane, AlertCircle, XCircle, 
  RefreshCw, Trash2, Eye, Edit, Loader2, Plus, ArrowLeft
} from 'lucide-react';

const UserBooking = () => {
  const API_BASE_URL = "https://parksy-backend.onrender.com";
  
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [processingAction, setProcessingAction] = useState(false);
  const [authStatus, setAuthStatus] = useState({ isLoggedIn: false, user: null });
  const [actionReason, setActionReason] = useState('');
  const [amendFormData, setAmendFormData] = useState({});

  // Get auth token
  const getAuthToken = () => {
    const tokenKeys = ['token', 'authToken', 'jwt', 'access_token'];
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token.includes('.') && token.split('.').length === 3) {
        return token;
      }
    }
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        if (userObj.token) return userObj.token;
        if (userObj.access_token) return userObj.access_token;
      } catch (e) {
        console.error('Failed to parse user object:', e);
      }
    }
    return null;
  };

  // Get user info
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    return null;
  };

  // Check auth on mount
  useEffect(() => {
    const token = getAuthToken();
    const user = getUserInfo();
    const isLoggedIn = !!(token && user);
    
    setAuthStatus({ isLoggedIn, user });
    
    if (!isLoggedIn) {
      setError('Please log in to view your bookings');
      setLoading(false);
    }
  }, []);

  // Fetch user bookings
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) return;

    try {
      setLoading(true);
      setError(null);
      
      const authToken = getAuthToken();
      if (!authToken) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/api/parking/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Session expired. Please log in again.');
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to fetch bookings');

      // Process bookings - Debug logging
      const bookingsArray = result.data || [];
      console.log('Raw bookings from API:', bookingsArray);
      
      const processedBookings = bookingsArray.map(booking => {
        console.log('Processing booking:', booking);
        
        return {
          ...booking,
          _id: booking.id,
          is_test: booking.is_test_payment || booking.our_reference?.includes('TEST') || true, // Force true for testing
          // FOR TESTING: Force enable cancel/amend for all bookings
          can_cancel: true, // Always allow cancel for testing
          can_amend: true,  // Always allow amend for testing
          show_actions: true // Force show actions
        };
      });

      console.log('Processed bookings:', processedBookings);
      setUserBookings(processedBookings);
      
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load bookings when authenticated
  useEffect(() => {
    if (authStatus.isLoggedIn) {
      fetchUserBookings();
    }
  }, [authStatus.isLoggedIn]);

  // Get detailed booking info
  const getBookingDetails = async (reference) => {
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/parking/bookings/${reference}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const details = result.success ? result.data : null;
        if (details) {
          // Ensure action buttons can be shown in modal
          details.can_cancel = true;
          details.can_amend = true;
          details.show_actions = true;
        }
        return details;
      }
    } catch (error) {
      console.error('Failed to get booking details:', error);
    }
    return null;
  };

  // Cancel booking
  const cancelBooking = async () => {
    if (!selectedBooking) return;

    setProcessingAction(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/parking/cancel-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          booking_reference: selectedBooking.our_reference,
          reason: actionReason || 'User requested cancellation'
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert('Booking cancelled successfully!');
        setShowModal(false);
        setSelectedBooking(null);
        setActionReason('');
        await fetchUserBookings();
      } else {
        throw new Error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      alert(`Failed to cancel booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Amend booking
  const amendBooking = async () => {
    if (!selectedBooking) return;

    setProcessingAction(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/parking/amend-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          booking_reference: selectedBooking.our_reference,
          ...amendFormData
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert('Booking amended successfully!');
        setShowModal(false);
        setSelectedBooking(null);
        setAmendFormData({});
        await fetchUserBookings();
      } else {
        throw new Error(result.message || 'Failed to amend booking');
      }
    } catch (error) {
      alert(`Failed to amend booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete booking
  const deleteBooking = (bookingRef) => {
    if (window.confirm('Delete this booking record?')) {
      setUserBookings(prev => prev.filter(b => b.our_reference !== bookingRef));
      setShowModal(false);
      alert('Booking record removed');
    }
  };

  // Utilities
  const formatCurrency = (amount) => `£${(amount || 0).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };
  const getStatusColor = (status) => {
    const colors = {
      'confirmed': '#10b981',
      'cancelled': '#ef4444', 
      'pending': '#f59e0b',
      'refunded': '#6366f1'
    };
    return colors[status] || '#6b7280';
  };

  // Check if booking should show action buttons
  const shouldShowActions = (booking) => {
    console.log('Checking actions for booking:', booking.our_reference, {
      status: booking.status,
      can_cancel: booking.can_cancel,
      can_amend: booking.can_amend,
      show_actions: booking.show_actions,
      is_test: booking.is_test
    });
    
    // For testing - always show if not cancelled
    return booking.status !== 'cancelled';
  };

  // If not logged in
  if (!authStatus.isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ maxWidth: '400px', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
          <h2>Login Required</h2>
          <p>Please log in to view your bookings</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.href = '/#/login'}
              style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <RefreshCw size={48} style={{ color: '#3b82f6', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <h2>Loading Your Bookings...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ maxWidth: '500px', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2>Error Loading Bookings</h2>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={fetchUserBookings} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Try Again
            </button>
            <button onClick={() => window.location.href = '/'} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => window.location.href = '/'} style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ margin: '0', color: '#1f2937' }}>My Bookings</h1>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '0.875rem' }}>{authStatus.user?.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.href = '/#/parking'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} />
              New Booking
            </button>
            <button onClick={fetchUserBookings} style={{ padding: '0.75rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{userBookings.length}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{userBookings.filter(b => b.status === 'confirmed').length}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Active</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{userBookings.filter(b => b.status === 'cancelled').length}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cancelled</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
              {formatCurrency(userBookings.reduce((sum, booking) => sum + (booking.booking_amount || 0), 0))}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Spent</div>
          </div>
        </div>

        {/* Bookings List */}
        {userBookings.length === 0 ? (
          <div style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Plane size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
            <h3>No Bookings Found</h3>
            <p>You haven't made any bookings yet.</p>
            <button 
              onClick={() => window.location.href = '/#/parking'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} />
              Make Your First Booking
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {userBookings.map((booking, index) => (
              <div key={booking._id || index} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                {/* Booking Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <strong style={{ color: '#1f2937' }}>#{booking.our_reference}</strong>
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem', 
                      borderRadius: '4px',
                      background: booking.status === 'confirmed' ? '#dcfce7' : '#fee2e2',
                      color: getStatusColor(booking.status)
                    }}>
                      {booking.status}
                    </span>
                    {booking.is_test && (
                      <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.625rem', background: '#f59e0b', color: 'white', borderRadius: '4px' }}>
                        TEST
                      </span>
                    )}
                  </div>
                  
                  {/* Action Buttons - SIMPLIFIED CONDITION */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {/* View Button - Always show */}
                    <button
                      onClick={async () => {
                        console.log('View button clicked for:', booking.our_reference);
                        const details = await getBookingDetails(booking.our_reference);
                        setSelectedBooking(details || booking);
                        setModalType('view');
                        setShowModal(true);
                      }}
                      style={{ padding: '0.25rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Eye size={14} />
                    </button>
                    
                    {/* Amend Button - Show for all non-cancelled bookings */}
                    {shouldShowActions(booking) && (
                      <button
                        onClick={async () => {
                          console.log('Amend button clicked for:', booking.our_reference);
                          const details = await getBookingDetails(booking.our_reference);
                          setSelectedBooking(details || booking);
                          setModalType('amend');
                          setAmendFormData({});
                          setShowModal(true);
                        }}
                        style={{ padding: '0.25rem', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    
                    {/* Cancel Button - Show for all non-cancelled bookings */}
                    {shouldShowActions(booking) && (
                      <button
                        onClick={() => {
                          console.log('Cancel button clicked for:', booking.our_reference);
                          setSelectedBooking(booking);
                          setModalType('cancel');
                          setActionReason('');
                          setShowModal(true);
                        }}
                        style={{ padding: '0.25rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    
                    {/* Delete Button - Only for cancelled bookings */}
                    {booking.status === 'cancelled' && (
                      <button
                        onClick={() => deleteBooking(booking.our_reference)}
                        style={{ padding: '0.25rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Booking Details */}
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{booking.product_name || 'Airport Parking'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    <Plane size={16} />
                    <span>{booking.airport_code}</span>
                  </div>
                  
                  <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <Calendar size={14} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Drop-off: {formatDate(booking.travel_details?.dropoff_date)} {booking.travel_details?.dropoff_time}
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <Calendar size={14} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                      Pick-up: {formatDate(booking.travel_details?.pickup_date)} {booking.travel_details?.pickup_time}
                    </div>
                    {booking.vehicle_details?.car_registration_number && (
                      <div>
                        <Car size={14} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
                        {booking.vehicle_details.car_registration_number}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(booking.booking_amount)}
                    </div>
                    <div style={{ 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem', 
                      borderRadius: '4px',
                      background: booking.payment_status === 'paid' ? '#dcfce7' : '#fee2e2',
                      color: booking.payment_status === 'paid' ? '#166534' : '#dc2626'
                    }}>
                      {booking.payment_status || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedBooking && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.5)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', zIndex: 1000 
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{ 
              background: 'white', borderRadius: '12px', maxWidth: '600px', 
              maxHeight: '90vh', overflow: 'auto', margin: '1rem', width: '100%' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0 }}>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'amend' && 'Amend Booking'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {modalType === 'view' ? (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3>Service Information</h3>
                    <p><strong>Service:</strong> {selectedBooking.product_name || 'Airport Parking'}</p>
                    <p><strong>Airport:</strong> {selectedBooking.airport_code}</p>
                    <p><strong>Reference:</strong> {selectedBooking.our_reference}</p>
                    <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedBooking.status) }}>{selectedBooking.status}</span></p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3>Travel Information</h3>
                    <p><strong>Drop-off:</strong> {formatDate(selectedBooking.travel_details?.dropoff_date)} at {selectedBooking.travel_details?.dropoff_time}</p>
                    <p><strong>Pick-up:</strong> {formatDate(selectedBooking.travel_details?.pickup_date)} at {selectedBooking.travel_details?.pickup_time}</p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3>Payment Information</h3>
                    <p><strong>Amount:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{formatCurrency(selectedBooking.booking_amount)}</span></p>
                    <p><strong>Status:</strong> {selectedBooking.payment_status}</p>
                  </div>

                  {/* ACTION BUTTONS - SIMPLIFIED CONDITION FOR MODAL */}
                  {selectedBooking.status !== 'cancelled' && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <button 
                        onClick={() => { 
                          console.log('Modal amend button clicked');
                          setModalType('amend'); 
                          setAmendFormData({}); 
                        }}
                        style={{ padding: '0.75rem 1.5rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        Amend Booking
                      </button>
                      <button 
                        onClick={() => {
                          console.log('Modal cancel button clicked');
                          setModalType('cancel');
                        }}
                        style={{ padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              ) : modalType === 'amend' ? (
                <div>
                  <p style={{ color: '#1e40af', marginBottom: '1.5rem' }}>Make changes to your booking details. Only fill in the fields you want to change.</p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Drop-off Time</label>
                    <input
                      type="time"
                      value={amendFormData.dropoff_time || ''}
                      onChange={(e) => setAmendFormData(prev => ({ ...prev, dropoff_time: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Pick-up Time</label>
                    <input
                      type="time"
                      value={amendFormData.pickup_time || ''}
                      onChange={(e) => setAmendFormData(prev => ({ ...prev, pickup_time: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Car Registration</label>
                    <input
                      type="text"
                      value={amendFormData.car_registration_number || ''}
                      onChange={(e) => setAmendFormData(prev => ({ ...prev, car_registration_number: e.target.value.toUpperCase() }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setModalType('view')}
                      style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button 
                      onClick={amendBooking}
                      disabled={processingAction}
                      style={{ padding: '0.75rem 1.5rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {processingAction ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <p style={{ color: '#92400e', margin: 0 }}>This will process a refund according to the cancellation policy. This action cannot be undone.</p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason (Optional)</label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Why are you cancelling this booking?"
                      rows={3}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setShowModal(false)}
                      style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Keep Booking
                    </button>
                    <button 
                      onClick={cancelBooking}
                      disabled={processingAction}
                      style={{ padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {processingAction ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Cancel Booking'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserBooking;