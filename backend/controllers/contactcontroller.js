const nodemailer = require('nodemailer');
const EmergencyContact = require('../models/emergencycontact'); // Make sure path and casing is correct

// Create reusable transporter object - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Parking-specific inquiry types
const INQUIRY_TYPES = {
  NOT_FINDING_PARKING: 'Not Finding Parking Spot',
  DOUBLE_BOOKING: 'Double Booking Issue',
  CANCEL_BOOKING: 'Cancel Booking Request',
  PAYMENT_ISSUE: 'Payment Related Issue',
  TECHNICAL_PROBLEM: 'Technical Problem',
  PARKING_QUALITY: 'Parking Spot Quality Issue',
  REFUND_REQUEST: 'Refund Request',
  ACCOUNT_ISSUE: 'Account Related Issue',
  OTHER: 'Other Emergency'
};

// Submit contact form
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message } = req.body;

    // Input validation
    if (!name || !email || !phone || !inquiryType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields (Name, Email, Phone, Issue Type, and Message)',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number',
      });
    }

    // Validate inquiry type
    if (!Object.values(INQUIRY_TYPES).includes(inquiryType)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid inquiry type',
      });
    }

    // Validate message length
    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters long',
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be less than 1000 characters',
      });
    }

    // Generate ticket ID for tracking
    const ticketId = `PARKSY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Determine priority based on inquiry type
    const highPriorityTypes = ['Double Booking Issue', 'Payment Related Issue', 'Refund Request'];
    const priority = highPriorityTypes.includes(inquiryType) ? 'HIGH' : 'NORMAL';

    // Get user IP and user agent for tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.get('User-Agent');

    // Create emergency contact record in database
    const emergencyContact = new EmergencyContact({
      ticketId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      inquiryType,
      message: message.trim(),
      priority,
      ipAddress,
      userAgent
    });

    // Save to database first
    const savedContact = await emergencyContact.save();

    // Email to admin with enhanced formatting
    const adminMailOptions = {
      from: `"Parksy Support Widget" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🚨 [${priority}] Parksy Support - ${inquiryType} | Ticket: ${ticketId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚗 PARKSY SUPPORT</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">New Emergency Contact</p>
          </div>
          
          <!-- Ticket Info -->
          <div style="background-color: white; padding: 20px; border-left: 5px solid ${priority === 'HIGH' ? '#dc2626' : '#2563eb'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2 style="color: #1f2937; margin: 0;">Ticket #${ticketId}</h2>
              <span style="background-color: ${priority === 'HIGH' ? '#fecaca' : '#dbeafe'}; color: ${priority === 'HIGH' ? '#dc2626' : '#2563eb'}; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 12px;">
                ${priority} PRIORITY
              </span>
            </div>
            <p style="color: #6b7280; margin: 0;">Received: ${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Database ID: ${savedContact._id}</p>
          </div>
          
          <!-- Customer Details -->
          <div style="background-color: white; padding: 25px; margin-top: 1px;">
            <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👤 Customer Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
              </div>
              <div>
                <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #2563eb;">${phone}</a></p>
                <p style="margin: 8px 0;"><strong>IP Address:</strong> ${ipAddress || 'Unknown'}</p>
              </div>
            </div>
          </div>
          
          <!-- Issue Details -->
          <div style="background-color: white; padding: 25px; margin-top: 1px;">
            <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🎯 Issue Details</h3>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Category:</strong> ${inquiryType}</p>
            </div>
          </div>
          
          <!-- Message -->
          <div style="background-color: white; padding: 25px; margin-top: 1px;">
            <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">💬 Customer Message</h3>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; font-size: 16px; line-height: 1.6;">
              ${message.replace(/\n/g, '<br/>')}
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div style="background-color: white; padding: 25px; text-align: center; margin-top: 1px;">
            <h3 style="color: #374151; margin-top: 0;">Quick Actions</h3>
            <div style="margin: 20px 0;">
              <a href="mailto:${email}?subject=Re: ${inquiryType} - Ticket ${ticketId}" 
                 style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold;">
                📧 Reply to Customer
              </a>
              <a href="tel:${phone}" style="background-color: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold;">📞 Call Customer</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              <a href="${process.env.ADMIN_DASHBOARD_URL || '#'}/tickets/${savedContact._id}" style="color: #2563eb;">View in Admin Dashboard →</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              Parksy Admin Dashboard | Support Ticket System<br/>
              <span style="font-size: 12px;">Please respond within 24 hours for normal priority, 2 hours for high priority tickets</span>
            </p>
          </div>
        </div>
      `,
    };

    // Email to user (confirmation)
    const userMailOptions = {
      from: `"Parksy Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🚗 Parksy Emergency Support - Your ticket #${ticketId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚗 PARKSY</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Emergency Request Received!</h2>
          </div>
          
          <!-- Confirmation Message -->
          <div style="background-color: white; padding: 30px; text-align: center;">
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 10px; border: 2px solid #10b981; margin-bottom: 25px;">
              <h3 style="color: #065f46; margin-top: 0;">✅ Emergency Request Processed!</h3>
              <p style="color: #047857; margin: 0;">Hi <strong>${name}</strong>! We've received your emergency request and our support team will respond immediately.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #374151; margin-top: 0;">📋 Your Emergency Ticket Details</h3>
              <p><strong>Ticket ID:</strong> <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${ticketId}</span></p>
              <p><strong>Issue Type:</strong> ${inquiryType}</p>
              <p><strong>Priority:</strong> <span style="color: ${priority === 'HIGH' ? '#dc2626' : '#2563eb'}; font-weight: bold;">${priority}</span></p>
              <p><strong>Contact Number:</strong> ${phone}</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #92400e; margin-top: 0;">⏰ Emergency Response Timeline</h3>
              <p style="color: #a16207; margin: 0;">
                ${priority === 'HIGH' 
                  ? '<strong>HIGH PRIORITY:</strong> We\'ll respond within <strong>2 hours</strong>' 
                  : '<strong>NORMAL PRIORITY:</strong> We\'ll respond within <strong>24 hours</strong>'
                }
              </p>
              <p style="color: #a16207; margin: 10px 0 0 0; font-size: 14px;">Our team may call you at ${phone} for urgent matters.</p>
            </div>
          </div>
          
          <!-- Your Message Summary -->
          <div style="background-color: white; padding: 25px;">
            <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📝 Your Emergency Details</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
              ${message.replace(/\n/g, '<br/>')}
            </div>
          </div>
          
          <!-- What's Next -->
          <div style="background-color: white; padding: 25px;">
            <h3 style="color: #374151; margin-top: 0;">🎯 What happens next?</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li>Our emergency support team will review your request immediately</li>
              <li>You'll receive a personalized response at <strong>${email}</strong></li>
              <li>We may call you at <strong>${phone}</strong> for urgent assistance</li>
              <li>Keep your ticket ID (<strong>${ticketId}</strong>) for reference</li>
              <li>Check your spam folder if you don't see our response</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #1f2937; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
            <h3 style="color: #10b981; margin-top: 0;">🚨 Emergency Contact Info</h3>
            <p style="margin: 15px 0; opacity: 0.9;">
              📧 Email: support@parksy.com<br/>
              📱 Emergency Hotline: <strong>+1-800-PARKSY-911</strong><br/>
              🌐 Visit: www.parksy.com/emergency
            </p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.7;">
              For life-threatening emergencies, please call 911.<br/>
              <strong>The Parksy Emergency Support Team</strong> 🚗
            </p>
          </div>
        </div>
      `,
    };

    // Send both emails and update database with email status
    try {
      await transporter.sendMail(adminMailOptions);
      savedContact.emailSent.admin = true;
      
      await transporter.sendMail(userMailOptions);
      savedContact.emailSent.user = true;
      
      await savedContact.save();
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue with response even if emails fail
    }

    // Log successful submission
    console.log(`[EMERGENCY CONTACT] New submission saved: ${ticketId} | ${inquiryType} | ${email} | DB ID: ${savedContact._id}`);

    res.status(200).json({
      success: true,
      message: `Thank you ${name}! Your emergency ticket #${ticketId} has been submitted and saved. We'll respond ${priority === 'HIGH' ? 'within 2 hours' : 'within 24 hours'}.`,
      ticketId,
      priority,
      dbId: savedContact._id
    });

  } catch (error) {
    console.error('Emergency contact submission error:', error);
    
    // Handle specific database errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + validationErrors.join(', ')
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A ticket with this ID already exists. Please try again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Emergency system error! Please try again or contact us directly at support@parksy.com',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get inquiry types (for frontend dropdown)
exports.getInquiryTypes = (req, res) => {
  res.status(200).json({
    success: true,
    inquiryTypes: Object.values(INQUIRY_TYPES)
  });
};

// Get all emergency contacts (for admin dashboard)
exports.getAllEmergencyContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const priority = req.query.priority;
    const inquiryType = req.query.inquiryType;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (inquiryType) filter.inquiryType = inquiryType;
    
    const contacts = await EmergencyContact.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await EmergencyContact.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency contacts'
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await EmergencyContact.getDashboardStats();
    
    // Get recent activity (last 7 days)
    const recentActivity = await EmergencyContact.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(5);
    
    res.status(200).json({
      success: true,
      stats,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// Update emergency contact status (for admin)
exports.updateEmergencyContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse, assignedTo } = req.body;
    
    const updateData = { status };
    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.responseDate = new Date();
    }
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating emergency contact'
    });
  }
};