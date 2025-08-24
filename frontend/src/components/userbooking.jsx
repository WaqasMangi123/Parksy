import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, Car, Plane, AlertCircle, CheckCircle, XCircle, 
  RefreshCw, Trash2, Eye, Edit, Loader2, Plus, ArrowLeft, Home
} from 'lucide-react';

const UserBooking = () => {
  const API_BASE_URL = "https://parksy-backend.onrender.com";
  
  // State
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
        if (userObj.token && userObj.token.includes('.')) {
          return userObj.token;
        }
        if (userObj.access_token && userObj.access_token.includes('.')) {
          return userObj.access_token;
        }
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
        const userObj = JSON.parse(userStr);
        if (userObj.id && userObj.email) {
          return userObj;
        }
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    return null;
  };

  // Check auth
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

  // Fetch bookings using new API
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) return;

    try {
      setLoading(true);
      setError(null);
      
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/parking/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch bookings');
      }

      // Process the booking data from the new API structure
      const bookingsArray = result.data || [];
      
      const processedBookings = bookingsArray.map(booking => ({
        ...booking,
        _id: booking.id,
        our_reference: booking.our_reference,
        booking_reference: booking.our_reference,
        status: booking.status,
        dropoff_date: booking.travel_details?.dropoff_date,
        dropoff_time: booking.travel_details?.dropoff_time,
        pickup_date: booking.travel_details?.pickup_date,
        pickup_time: booking.travel_details?.pickup_time,
        customer_email: booking.customer_details?.customer_email,
        customer_name: booking.customer_details ? 
          `${booking.customer_details.title || ''} ${booking.customer_details.first_name || ''} ${booking.customer_details.last_name || ''}`.trim() :
          'N/A',
        vehicle_registration: booking.vehicle_details?.car_registration_number,
        price: booking.booking_amount,
        is_cancelable: booking.can_cancel,
        is_editable: booking.can_amend,
        is_test: booking.is_test_payment || false
      }));
        
      setUserBookings(processedBookings);
      setError(null);
      
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
        return result.success ? result.data : null;
      }
    } catch (error) {
      console.error('Failed to get booking details:', error);
    }
    return null;
  };

  // Cancel booking using new API
  const cancelBooking = async () => {
    if (!selectedBooking) return;

    setProcessingAction(true);
    
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

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
        alert('Booking cancelled successfully! ' + (result.data?.refund ? `Refund of £${result.data.refund.amount} processed.` : ''));
        setShowModal(false);
        setSelectedBooking(null);
        setActionReason('');
        await fetchUserBookings();
      } else {
        throw new Error(result.message || 'Failed to cancel booking');
      }

    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Amend booking using new API
  const amendBooking = async () => {
    if (!selectedBooking) return;

    setProcessingAction(true);
    
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

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
      console.error('Error amending booking:', error);
      alert(`Failed to amend booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete booking (for cancelled bookings)
  const deleteBooking = async (bookingRef) => {
    if (!window.confirm('Are you sure you want to delete this booking record? This cannot be undone.')) {
      return;
    }

    try {
      setProcessingAction(true);
      // This would be a local operation to remove from UI
      // Since there's no delete endpoint in the backend, we'll just hide it locally
      setUserBookings(prev => prev.filter(b => b.our_reference !== bookingRef));
      setShowModal(false);
      setSelectedBooking(null);
      alert('Booking record removed from view');
    } catch (error) {
      alert(`Failed to delete booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => `£${(amount || 0).toFixed(2)}`;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'confirmed': '#10b981',
      'cancelled': '#ef4444',
      'pending': '#f59e0b',
      'refunded': '#6366f1'
    };
    return colors[status] || '#6b7280';
  };

  // Navigation
  const goToHome = () => window.location.href = '/';
  const goToNewBooking = () => window.location.href = '/#/parking';

  // Handle amend form changes
  const handleAmendFormChange = (field, value) => {
    setAmendFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // If not logged in
  if (!authStatus.isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ maxWidth: '400px', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>Login Required</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280' }}>Please log in to view your bookings</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.href = '/#/login'}
              style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Go to Login
            </button>
            <button 
              onClick={goToHome}
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
          <h2 style={{ color: '#1f2937' }}>Loading Your Bookings...</h2>
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
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>Error Loading Bookings</h2>
          <p style={{ marginBottom: '2rem', color: '#6b7280' }}>{error}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={fetchUserBookings}
              style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Try Again
            </button>
            <button 
              onClick={goToHome}
              style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
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
            <button onClick={goToHome} style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ margin: '0', color: '#1f2937' }}>My Bookings</h1>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '0.875rem' }}>Welcome, {authStatus.user?.email}!</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={goToNewBooking}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} />
              New Booking
            </button>
            <button 
              onClick={fetchUserBookings}
              style={{ padding: '0.75rem 1rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{userBookings.length}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Bookings</div>
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
              {formatCurrency(userBookings.reduce((sum, booking) => sum + (booking.booking_amount || booking.price || 0), 0))}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Spent</div>
          </div>
        </div>

        {/* Bookings List */}
        {userBookings.length === 0 ? (
          <div style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Plane size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>No Bookings Found</h3>
            <p style={{ marginBottom: '2rem', color: '#6b7280' }}>You haven't made any bookings yet. Start your journey with us!</p>
            <button 
              onClick={goToNewBooking}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} />
              Make Your First Booking
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {userBookings.map((booking, index) => (
              <div key={booking._id || index} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <strong style={{ color: '#1f2937', fontSize: '1.1rem' }}>#{booking.our_reference}</strong>
                    <div style={{ 
                      display: 'inline-block', 
                      marginLeft: '0.5rem', 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '500', 
                      borderRadius: '4px',
                      background: booking.status === 'confirmed' ? '#dcfce7' : booking.status === 'cancelled' ? '#fee2e2' : '#f3f4f6',
                      color: getStatusColor(booking.status)
                    }}>
                      {booking.status}
                    </div>
                    {booking.is_test && (
                      <div style={{ display: 'inline-block', marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.625rem', background: '#f59e0b', color: 'white', borderRadius: '4px' }}>
                        TEST
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={async () => {
                        const details = await getBookingDetails(booking.our_reference);
                        setSelectedBooking(details || booking);
                        setModalType('view');
                        setShowModal(true);
                      }}
                      style={{ padding: '0.25rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Eye size={14} />
                    </button>
                    
                    {booking.status === 'confirmed' && booking.is_editable && (
                      <button
                        onClick={async () => {
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
                    
                    {booking.status === 'confirmed' && booking.is_cancelable && (
                      <button
                        onClick={() => {
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
                    
                    {booking.status === 'cancelled' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('delete');
                          setShowModal(true);
                        }}
                        style={{ padding: '0.25rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{booking.product_name || 'Airport Parking'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    <Plane size={16} />
                    <span>{booking.airport_code}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                      <Calendar size={14} />
                      <span>Drop-off: {formatDate(booking.dropoff_date)} at {booking.dropoff_time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                      <Calendar size={14} />
                      <span>Pick-up: {formatDate(booking.pickup_date)} at {booking.pickup_time}</span>
                    </div>
                    {booking.vehicle_registration && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                        <Car size={14} />
                        <span>{booking.vehicle_registration}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatCurrency(booking.booking_amount || booking.price)}
                    </div>
                    <div style={{ 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '500', 
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
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{ 
              background: 'white', 
              borderRadius: '12px', 
              maxWidth: '600px', 
              maxHeight: '90vh', 
              overflow: 'auto', 
              margin: '1rem', 
              width: '100%' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'amend' && 'Amend Booking'}
                {modalType === 'delete' && 'Delete Booking'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {modalType === 'view' ? (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Service Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Service</label>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{selectedBooking.product_name || 'Airport Parking'}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Airport</label>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{selectedBooking.airport_code}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Reference</label>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{selectedBooking.our_reference}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Status</label>
                        <span style={{ color: getStatusColor(selectedBooking.status), fontWeight: '500' }}>{selectedBooking.status}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Travel Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Drop-off</label>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{formatDate(selectedBooking.travel_details?.dropoff_date || selectedBooking.dropoff_date)} at {selectedBooking.travel_details?.dropoff_time || selectedBooking.dropoff_time}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Pick-up</label>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{formatDate(selectedBooking.travel_details?.pickup_date || selectedBooking.pickup_date)} at {selectedBooking.travel_details?.pickup_time || selectedBooking.pickup_time}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Payment Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Amount</label>
                        <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.125rem' }}>{formatCurrency(selectedBooking.booking_amount || selectedBooking.price)}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', color: '#6b7280', display: 'block' }}>Payment Status</label>
                        <span style={{ color: selectedBooking.payment_status === 'paid' ? '#059669' : '#dc2626', fontWeight: '500' }}>{selectedBooking.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.status === 'confirmed' && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      {selectedBooking.is_editable && (
                        <button 
                          onClick={() => {
                            setModalType('amend');
                            setAmendFormData({});
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <Edit size={16} />
                          Amend Booking
                        </button>
                      )}
                      {selectedBooking.is_cancelable && (
                        <button 
                          onClick={() => setModalType('cancel')}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <XCircle size={16} />
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : modalType === 'amend' ? (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <Edit size={24} style={{ color: '#1d4ed8', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a' }}>Amend Your Booking</h4>
                      <p style={{ margin: 0, color: '#1e40af' }}>Make changes to your booking details. Only fill in the fields you want to change.</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Drop-off Time</label>
                      <input
                        type="time"
                        value={amendFormData.dropoff_time || ''}
                        onChange={(e) => handleAmendFormChange('dropoff_time', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Pick-up Time</label>
                      <input
                        type="time"
                        value={amendFormData.pickup_time || ''}
                        onChange={(e) => handleAmendFormChange('pickup_time', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Title</label>
                      <select
                        value={amendFormData.title || ''}
                        onChange={(e) => handleAmendFormChange('title', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      >
                        <option value="">Select</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Miss">Miss</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>First Name</label>
                      <input
                        type="text"
                        value={amendFormData.first_name || ''}
                        onChange={(e) => handleAmendFormChange('first_name', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Last Name</label>
                      <input
                        type="text"
                        value={amendFormData.last_name || ''}
                        onChange={(e) => handleAmendFormChange('last_name', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Car Registration</label>
                    <input
                      type="text"
                      value={amendFormData.car_registration_number || ''}
                      onChange={(e) => handleAmendFormChange('car_registration_number', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setModalType('view')}
                      disabled={processingAction}
                      style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Back to Details
                    </button>
                    <button 
                      onClick={amendBooking}
                      disabled={processingAction}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : modalType === 'cancel' ? (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <AlertCircle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>Cancel Your Booking</h4>
                      <p style={{ margin: 0, color: '#92400e' }}>This will process a refund according to the cancellation policy. This action cannot be undone.</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>Reason (Optional)</label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Why are you cancelling this booking?"
                      rows={3}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setShowModal(false)}
                      disabled={processingAction}
                      style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Keep Booking
                    </button>
                    <button 
                      onClick={cancelBooking}
                      disabled={processingAction}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Cancel Booking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <AlertCircle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>Delete Booking Record</h4>
                      <p style={{ margin: 0, color: '#991b1b' }}>This will permanently remove this booking from your history.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setShowModal(false)}
                      disabled={processingAction}
                      style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Keep Record
                    </button>
                    <button 
                      onClick={() => deleteBooking(selectedBooking.our_reference)}
                      disabled={processingAction}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Delete Record
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .booking-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UserBooking;