const nodemailer = require('nodemailer');

// Create reusable transporter object
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
  OTHER: 'Other'
};

// Submit contact form
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message } = req.body;

    // Input validation
    if (!name || !email || !inquiryType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields (Name, Email, Issue Type, and Message)',
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
    const highPriorityTypes = ['DOUBLE_BOOKING', 'PAYMENT_ISSUE', 'REFUND_REQUEST'];
    const priority = highPriorityTypes.some(type => INQUIRY_TYPES[type] === inquiryType) ? 'HIGH' : 'NORMAL';

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
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">New Customer Inquiry</p>
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
                <p style="margin: 8px 0;"><strong>Phone:</strong> ${phone ? `<a href="tel:${phone}" style="color: #2563eb;">${phone}</a>` : '<span style="color: #9ca3af;">Not provided</span>'}</p>
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
              ${phone ? `<a href="tel:${phone}" style="background-color: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold;">📞 Call Customer</a>` : ''}
            </div>
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
      subject: `🚗 Parksy Support Confirmation - Your ticket #${ticketId}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚗 PARKSY</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Thank you for contacting us!</h2>
          </div>
          
          <!-- Confirmation Message -->
          <div style="background-color: white; padding: 30px; text-align: center;">
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 10px; border: 2px solid #10b981; margin-bottom: 25px;">
              <h3 style="color: #065f46; margin-top: 0;">✅ Message Received Successfully!</h3>
              <p style="color: #047857; margin: 0;">Hi <strong>${name}</strong>! We've received your inquiry and our support team will respond soon.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #374151; margin-top: 0;">📋 Your Ticket Details</h3>
              <p><strong>Ticket ID:</strong> <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${ticketId}</span></p>
              <p><strong>Issue Type:</strong> ${inquiryType}</p>
              <p><strong>Priority:</strong> <span style="color: ${priority === 'HIGH' ? '#dc2626' : '#2563eb'}; font-weight: bold;">${priority}</span></p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #92400e; margin-top: 0;">⏰ Response Timeline</h3>
              <p style="color: #a16207; margin: 0;">
                ${priority === 'HIGH' 
                  ? 'High priority issue - We\'ll respond within <strong>2 hours</strong>' 
                  : 'Normal priority issue - We\'ll respond within <strong>24 hours</strong>'
                }
              </p>
            </div>
          </div>
          
          <!-- Your Message Summary -->
          <div style="background-color: white; padding: 25px;">
            <h3 style="color: #374151; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📝 Your Message</h3>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
              ${message.replace(/\n/g, '<br/>')}
            </div>
          </div>
          
          <!-- What's Next -->
          <div style="background-color: white; padding: 25px;">
            <h3 style="color: #374151; margin-top: 0;">🎯 What happens next?</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li>Our support team will review your inquiry</li>
              <li>You'll receive a personalized response at <strong>${email}</strong></li>
              <li>Keep your ticket ID (<strong>${ticketId}</strong>) for reference</li>
              <li>Check your spam folder if you don't see our response</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #1f2937; color: white; padding: 25px; text-align: center; border-radius: 0 0 10px 10px;">
            <h3 style="color: #10b981; margin-top: 0;">Need Immediate Help?</h3>
            <p style="margin: 15px 0; opacity: 0.9;">
              📧 Email: support@parksy.com<br/>
              📱 Emergency: For urgent parking issues, call our 24/7 hotline<br/>
              🌐 Visit: www.parksy.com/help
            </p>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.7;">
              Best regards,<br/>
              <strong>The Parksy Support Team</strong> 🚗
            </p>
          </div>
        </div>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    // Log successful submission
    console.log(`[CONTACT FORM] New submission: ${ticketId} | ${inquiryType} | ${email}`);

    res.status(200).json({
      success: true,
      message: `Thank you ${name}! Your ticket #${ticketId} has been submitted. We'll respond ${priority === 'HIGH' ? 'within 2 hours' : 'within 24 hours'}.`,
      ticketId,
      priority
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Oops! Something went wrong while sending your message. Please try again or contact us directly.',
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